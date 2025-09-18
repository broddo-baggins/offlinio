# Contributing to Offlinio

Thank you for your interest in contributing to Offlinio! This document provides guidelines and information for contributors.

## Legal Requirements

**All contributions must comply with legal requirements:**

1. **No Copyright Infringement**: Do not submit code, links, or references to unauthorized content sources
2. **Legal Use Only**: All features must be designed for lawful use cases only
3. **No DRM Circumvention**: Do not implement or suggest DRM bypassing functionality
4. **Respect Service Terms**: Ensure all integrations comply with third-party service terms

## How to Contribute

### Reporting Issues

1. **Check existing issues** first to avoid duplicates
2. **Use issue templates** when available
3. **Provide detailed information**:
   - OS and Node.js version
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages or logs (sanitize any personal information)

### Suggesting Features

1. **Open a discussion** first for major features
2. **Explain the use case** and legal justification
3. **Consider implementation complexity**
4. **Ensure compatibility** with existing architecture

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch** from `main`
3. **Make your changes** with proper testing
4. **Submit a pull request**

## Development Setup

### Prerequisites

- Node.js 18+ and npm 9+
- Git
- Code editor with TypeScript support

### Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/offlinio.git
cd offlinio

# Install dependencies
npm install

# Set up environment
cp env.example .env
# Edit .env with your configuration

# Initialize database
npm run db:generate
npm run db:migrate

# Start development server
npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run linting
npm run lint

# Run type checking
npx tsc --noEmit
```

## Coding Standards

### TypeScript

- **Use strict mode**: All new code must be written in TypeScript
- **Explicit types**: Avoid `any`, use proper type definitions
- **Interface definitions**: Export interfaces for public APIs
- **JSDoc comments**: Document public functions and classes

### Code Style

- **ESLint**: Follow the project's ESLint configuration
- **Prettier**: Use Prettier for code formatting
- **Naming conventions**:
  - `camelCase` for variables and functions
  - `PascalCase` for classes and interfaces
  - `UPPER_SNAKE_CASE` for constants
  - `kebab-case` for file names

### Architecture Principles

- **Single Responsibility**: Each module should have one clear purpose
- **Dependency Injection**: Use dependency injection for testability
- **Error Handling**: Always handle errors gracefully
- **Security First**: Validate all inputs and sanitize outputs
- **Legal Compliance**: Ensure all features respect legal boundaries

## Testing Requirements

### Test Coverage

- **Unit Tests**: Required for all new functions and classes
- **Integration Tests**: Required for API endpoints
- **E2E Tests**: Required for user-facing features
- **Minimum Coverage**: 80% line coverage for new code

### Test Types

```typescript
// Unit Test Example
describe('CatalogService', () => {
  test('should return downloaded content only', async () => {
    const catalog = new CatalogService();
    const result = await catalog.getDownloadedCatalog('movie', 'test');
    expect(result).toBeInstanceOf(Array);
  });
});

// Integration Test Example
describe('Addon Endpoints', () => {
  test('GET /manifest.json should return valid manifest', async () => {
    const response = await request(app).get('/manifest.json');
    expect(response.status).toBe(200);
    expect(response.body.id).toBe('community.offlinio');
  });
});
```

## Documentation

### Code Documentation

- **JSDoc comments** for all public APIs
- **README updates** for new features
- **Architecture documentation** for significant changes

### API Documentation

- **OpenAPI specs** for REST endpoints
- **TypeScript interfaces** for data structures
- **Usage examples** for complex features

## Security Guidelines

### Sensitive Data

- **Never commit** API keys, tokens, or credentials
- **Use environment variables** for configuration
- **Sanitize logs** to remove personal information
- **Encrypt sensitive data** in the database

### Input Validation

- **Validate all inputs** at API boundaries
- **Sanitize user content** before storage
- **Use parameterized queries** to prevent injection
- **Implement rate limiting** for public endpoints

## Pull Request Process

### Before Submitting

- [ ] **Tests pass**: All existing and new tests pass
- [ ] **Linting passes**: No ESLint or TypeScript errors
- [ ] **Coverage maintained**: Test coverage is at least 80%
- [ ] **Documentation updated**: README and JSDoc updated if needed
- [ ] **No sensitive data**: No API keys or personal info committed

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Legal Compliance
- [ ] Changes comply with legal requirements
- [ ] No unauthorized content sources added
- [ ] No DRM circumvention functionality

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests pass
- [ ] Documentation updated
```

### Review Process

1. **Automated checks** must pass (CI/CD pipeline)
2. **Code review** by maintainers
3. **Legal review** for sensitive changes
4. **Testing** on multiple platforms if applicable

## Architecture Overview

### Core Components

```
src/
├── addon.ts              # Stremio addon endpoints
├── server.ts             # Express server setup
├── services/             # Business logic
│   ├── catalog.ts        # Content catalog management
│   ├── real-debrid-client.ts  # Debrid service integration
│   └── auto-debrid.ts    # Service auto-detection
├── routes/               # API route handlers
├── utils/                # Utility functions
└── ui/                   # Web interface
```

### Design Patterns

- **Dependency Injection**: Services are injected for testability
- **Repository Pattern**: Database access abstracted through repositories
- **Factory Pattern**: Service creation through factories
- **Observer Pattern**: Event-driven architecture for downloads

## 📊 Performance Guidelines

### Response Times

- **Manifest endpoint**: < 100ms
- **Catalog endpoints**: < 500ms  
- **Stream endpoints**: < 200ms
- **File serving**: < 50ms first byte

### Resource Usage

- **Memory**: Keep memory usage under 512MB
- **CPU**: Avoid blocking operations on main thread
- **Disk**: Implement efficient file management
- **Network**: Use connection pooling and retries

## 🐛 Debugging

### Logging

```typescript
// Use structured logging
logger.info('Download started', {
  contentId: content.id.substring(0, 8) + '...',  // Sanitize IDs
  service: 'real-debrid',
  size: content.size
});

// Avoid logging sensitive data
logger.debug('API response', {
  status: response.status,
  // Don't log full response body or headers
});
```

### Development Tools

- **Prisma Studio**: `npm run db:studio` for database inspection
- **VS Code**: Recommended with TypeScript and ESLint extensions
- **Chrome DevTools**: For debugging the web UI
- **Postman**: For API testing (collection available)

## 🎯 Contribution Areas

### High Priority

- [ ] **Performance optimizations**
- [ ] **Additional debrid service support**
- [ ] **Mobile UI improvements**
- [ ] **Accessibility enhancements**

### Medium Priority

- [ ] **Additional platform support**
- [ ] **Advanced filtering options**
- [ ] **Backup/restore functionality**
- [ ] **Plugin architecture**

### Low Priority

- [ ] **Theme customization**
- [ ] **Advanced analytics**
- [ ] **Multi-language support**
- [ ] **Custom file organization**

## Getting Help

- **Documentation**: Check README and inline comments
- **Discussions**: Use GitHub Discussions for questions
- **Issues**: Create issues for bugs or feature requests
- **Discord**: Join our community Discord (link in README)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Offlinio!
