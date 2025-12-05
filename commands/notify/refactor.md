# Notify Command Refactor

The notify command has been refactored into a modular structure for better maintainability.

## Structure

```
notify/
├── index.js              # Main entry point
├── permissions.js        # Permission checks
├── storage.js            # Pending alerts storage
├── database.js           # Database operations
├── keyboards.js          # Keyboard builders
├── messages.js           # Message builders
└── handlers/
    ├── group.js          # Group chat handler
    ├── private.js        # Private chat handler
    ├── reply.js          # Reply handler
    └── callbacks/        # Callback handlers
        ├── index.js      # Router
        ├── create.js
        ├── view.js
        ├── edit.js
        ├── delete.js
        ├── back.js
        ├── direction.js
        ├── save.js
        └── cancel.js
```

## Benefits

- **Modular**: Each file has a single responsibility
- **Maintainable**: Easy to find and modify specific functionality
- **Testable**: Functions can be tested independently
- **Scalable**: Clear patterns for adding features
