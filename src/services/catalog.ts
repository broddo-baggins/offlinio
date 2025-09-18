/**
 * Catalog Service
 * 
 * Handles Stremio catalog generation from downloaded content
 */

import { prisma } from '../db.js';
import { logger } from '../utils/logger.js';

export interface CatalogMeta {
  id: string;
  type: 'movie' | 'series';
  name: string;
  poster?: string;
  posterShape?: 'poster' | 'landscape' | 'square';
  background?: string;
  logo?: string;
  description?: string;
  year?: number;
  imdbRating?: number;
  genre?: string[];
  director?: string[];
  cast?: string[];
  runtime?: string;
}

export interface SeriesMeta extends CatalogMeta {
  videos: Array<{
    id: string;
    title: string;
    season: number;
    episode: number;
    thumbnail?: string;
    overview?: string;
    released?: string;
  }>;
}

export interface Stream {
  name: string;
  title?: string;
  url: string;
  quality?: string;
  behaviorHints?: {
    notWebReady?: boolean;
    bingeGroup?: string;
    countryWhitelist?: string[];
    videoSize?: {
      width: number;
      height: number;
    };
  };
}

/**
 * Get downloaded content catalog
 */
export async function getDownloadedCatalog(
  type: string,
  catalogId: string,
  options: {
    search?: string;
    genre?: string;
    skip?: number;
    limit?: number;
  } = {}
): Promise<CatalogMeta[]> {
  try {
    const { search, genre, skip = 0, limit = 100 } = options;

    if (type === 'movie' && catalogId === 'offlinio-movies') {
      const whereClause: any = {
        type: 'movie',
        status: 'completed'
      };

      // Add search filter
      if (search) {
        whereClause.title = {
          contains: search,
          mode: 'insensitive'
        };
      }

      // Add genre filter
      if (genre) {
        whereClause.genre = {
          contains: genre,
          mode: 'insensitive'
        };
      }

      const movies = await prisma.content.findMany({
        where: whereClause,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit
      });

      return movies.map(movie => ({
        id: movie.id,
        type: 'movie' as const,
        name: movie.title,
        poster: movie.posterUrl || undefined,
        posterShape: 'poster' as const,
        year: movie.year || undefined,
        description: movie.description || undefined,
        genre: movie.genre ? movie.genre.split(',').map(g => g.trim()) : undefined
      }));
    }

    if (type === 'series' && catalogId === 'offlinio-series') {
      const whereClause: any = {
        type: 'series',
        status: 'completed'
      };

      // Add search filter
      if (search) {
        whereClause.title = {
          contains: search,
          mode: 'insensitive'
        };
      }

      // Add genre filter
      if (genre) {
        whereClause.genre = {
          contains: genre,
          mode: 'insensitive'
        };
      }

      const episodes = await prisma.content.findMany({
        where: whereClause,
        orderBy: [
          { title: 'asc' },
          { season: 'asc' },
          { episode: 'asc' }
        ]
      });

      // Group episodes by series
      const seriesMap = new Map<string, typeof episodes>();
      
      episodes.forEach(episode => {
        const seriesKey = episode.seriesId || episode.title;
        if (!seriesMap.has(seriesKey)) {
          seriesMap.set(seriesKey, []);
        }
        seriesMap.get(seriesKey)!.push(episode);
      });

      // Convert to catalog format
      const series = Array.from(seriesMap.entries())
        .slice(skip, skip + limit)
        .map(([seriesKey, episodeList]) => {
          const firstEpisode = episodeList[0];
          return {
            id: seriesKey,
            type: 'series' as const,
            name: firstEpisode.title,
            poster: firstEpisode.posterUrl || undefined,
            posterShape: 'poster' as const,
            description: firstEpisode.description || `${episodeList.length} episodes downloaded`,
            genre: firstEpisode.genre ? firstEpisode.genre.split(',').map(g => g.trim()) : undefined
          };
        });

      return series;
    }

    return [];
  } catch (error) {
    logger.error('Failed to get downloaded catalog:', error);
    return [];
  }
}

/**
 * Get series metadata with episode list
 */
export async function getSeriesMeta(seriesId: string): Promise<SeriesMeta | null> {
  try {
    const episodes = await prisma.content.findMany({
      where: {
        OR: [
          { seriesId },
          { title: seriesId }
        ],
        type: 'series',
        status: 'completed'
      },
      orderBy: [
        { season: 'asc' },
        { episode: 'asc' }
      ]
    });

    if (episodes.length === 0) {
      return null;
    }

    const firstEpisode = episodes[0];

    return {
      id: seriesId,
      type: 'series',
      name: firstEpisode.title,
      poster: firstEpisode.posterUrl || undefined,
      posterShape: 'poster' as const,
      description: firstEpisode.description || `${episodes.length} episodes available offline`,
      genre: firstEpisode.genre ? firstEpisode.genre.split(',').map(g => g.trim()) : undefined,
      videos: episodes.map(episode => ({
        id: episode.id,
        title: `S${String(episode.season || 1).padStart(2, '0')}E${String(episode.episode || 1).padStart(2, '0')}`,
        season: episode.season || 1,
        episode: episode.episode || 1,
        released: episode.createdAt.toISOString().split('T')[0]
      }))
    };
  } catch (error) {
    logger.error('Failed to get series meta:', error);
    return null;
  }
}

/**
 * Get local stream for content ID
 */
export async function getLocalStreamForId(contentId: string): Promise<Stream | null> {
  try {
    const content = await prisma.content.findUnique({
      where: { id: contentId }
    });

    if (!content || !content.filePath || content.status !== 'completed') {
      logger.debug('No local stream available for content:', { contentId });
      return null;
    }

    const port = process.env.PORT || 11471;
    const url = `http://127.0.0.1:${port}/files/${encodeURIComponent(content.filePath)}`;

    // Determine quality from stored quality or filename
    let quality = content.quality || 'Unknown';
    if (!content.quality && content.filePath) {
      // Try to extract quality from filename
      const qualityMatch = content.filePath.match(/\b(4K|2160p|1080p|720p|480p|360p)\b/i);
      if (qualityMatch) {
        quality = qualityMatch[1];
      }
    }

    logger.debug('Serving local stream:', { 
      contentId: contentId.substring(0, 8) + '...', 
      quality 
    });

    return {
      name: `Offline (${quality})`,
      title: 'Play downloaded file',
      url,
      quality,
      behaviorHints: {
        bingeGroup: 'offlinio-offline',
        notWebReady: false
      }
    };
  } catch (error) {
    logger.error('Failed to get local stream:', error);
    return null;
  }
}

/**
 * Search downloaded content
 */
export async function searchDownloadedContent(
  query: string,
  type?: 'movie' | 'series'
): Promise<CatalogMeta[]> {
  try {
    const whereClause: any = {
      status: 'completed',
      title: {
        contains: query,
        mode: 'insensitive'
      }
    };

    if (type) {
      whereClause.type = type;
    }

    const results = await prisma.content.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      take: 50
    });

    return results.map(item => ({
      id: item.id,
      type: item.type as 'movie' | 'series',
      name: item.title,
      poster: item.posterUrl || undefined,
      posterShape: 'poster' as const,
      year: item.year || undefined,
      description: item.description || undefined,
      genre: item.genre ? item.genre.split(',').map(g => g.trim()) : undefined
    }));
  } catch (error) {
    logger.error('Failed to search content:', error);
    return [];
  }
}

/**
 * Get content statistics for catalogs
 */
export async function getContentStats(): Promise<{
  totalMovies: number;
  totalSeries: number;
  totalEpisodes: number;
  recentlyAdded: CatalogMeta[];
}> {
  try {
    const [movieCount, seriesCount, episodeCount, recent] = await Promise.all([
      prisma.content.count({
        where: { type: 'movie', status: 'completed' }
      }),
      prisma.content.count({
        where: { type: 'series', status: 'completed' }
      }),
      prisma.content.count({
        where: { type: 'series', status: 'completed' }
      }),
      prisma.content.findMany({
        where: { status: 'completed' },
        orderBy: { updatedAt: 'desc' },
        take: 10
      })
    ]);

    const recentlyAdded = recent.map(item => ({
      id: item.id,
      type: item.type as 'movie' | 'series',
      name: item.title,
      poster: item.posterUrl || undefined,
      posterShape: 'poster' as const,
      year: item.year || undefined
    }));

    return {
      totalMovies: movieCount,
      totalSeries: seriesCount,
      totalEpisodes: episodeCount,
      recentlyAdded
    };
  } catch (error) {
    logger.error('Failed to get content stats:', error);
    return {
      totalMovies: 0,
      totalSeries: 0,
      totalEpisodes: 0,
      recentlyAdded: []
    };
  }
}
