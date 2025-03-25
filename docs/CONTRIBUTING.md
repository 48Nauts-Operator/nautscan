# Contributing to NautScan

Thank you for your interest in contributing to NautScan! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please read it before contributing.

## Development Setup

1. **Fork the Repository**
   ```bash
   git clone https://github.com/48Nauts-Operator/nautscan.git
   cd nautscan
   ```

2. **Set Up Development Environment**
   ```bash
   # Backend setup
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt

   # Frontend setup
   cd frontend
   npm install
   ```

3. **Configure Environment Variables**
   ```bash
   # Backend
   cp .env.example .env
   # Edit .env with your configuration

   # Frontend
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

## Development Workflow

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow the coding standards
   - Write tests for new features
   - Update documentation

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: description of your changes"
   ```

4. **Push Changes**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Go to GitHub and create a new Pull Request
   - Link to related issues
   - Provide clear description of changes

## Coding Standards

### Python (Backend)
- Follow PEP 8 style guide
- Use type hints
- Write docstrings for functions and classes
- Keep functions focused and small
- Use meaningful variable names

### TypeScript/JavaScript (Frontend)
- Follow ESLint configuration
- Use TypeScript for new code
- Follow React best practices
- Use functional components
- Implement proper error handling

### Documentation
- Keep documentation up to date
- Use clear and concise language
- Include code examples where appropriate
- Update README.md for major changes

## Testing

### Backend Tests
```bash
# Run tests
pytest

# Run with coverage
pytest --cov=backend tests/
```

### Frontend Tests
```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

## Pull Request Process

1. **Before Submitting**
   - Ensure all tests pass
   - Update documentation
   - Rebase on main branch
   - Clean up commit history

2. **Pull Request Template**
   ```markdown
   ## Description
   [Description of changes]

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Documentation update

   ## Testing
   - [ ] Unit tests added/updated
   - [ ] Manual testing completed

   ## Screenshots
   [If applicable]

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Documentation updated
   - [ ] Tests added/updated
   - [ ] All tests passing
   ```

3. **Review Process**
   - Address review comments
   - Make requested changes
   - Keep commits clean and focused

## Release Process

1. **Version Bumping**
   - Update version in package.json
   - Update version in backend/__init__.py
   - Create release notes

2. **Release Checklist**
   - [ ] All tests passing
   - [ ] Documentation updated
   - [ ] Changelog updated
   - [ ] Version bumped
   - [ ] Release notes created

## Getting Help

- Open an issue for bugs or feature requests
- Join our community discussions
- Check existing documentation
- Contact maintainers

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License. 