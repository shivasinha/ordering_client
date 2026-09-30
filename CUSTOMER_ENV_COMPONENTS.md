# Customer Environment Components

This document explains the new component-based approach for handling customer-specific environment.js files in the ordering portal client.

## Overview

Instead of generating environment.js files at build time or using install(CODE) scripts, we now use dedicated CMake components for each customer. This approach provides better scalability, maintainability, and version control.

## How It Works

### 1. Customer-Specific Environment Files
Each customer has a dedicated environment file:
- `src/assets/environment_izs.js` - IZS customer configuration
- `src/assets/environment_sz.js` - SZ customer configuration
- `src/assets/environment.js` - Default/generic configuration

### 2. CMake Components
The `CustomerEnvironmentComponents.cmake` module automatically creates install components:
- `ORDERING_PORTAL_CLIENT_ENV_izs` - Installs environment_izs.js as environment.js
- `ORDERING_PORTAL_CLIENT_ENV_sz` - Installs environment_sz.js as environment.js

### 3. Packaging Integration
Customer packaging files (e.g., `IZS.cmake`, `SZ.cmake`) include the appropriate environment component in their packaging targets.

## Benefits

1. **Version Controlled**: All environment files are in git, making changes trackable
2. **Scalable**: Adding new customers only requires creating a new environment file
3. **Build-time Independent**: No need to modify files during build
4. **Component-based**: Uses CMake's component system for clean separation
5. **Generic Installation**: No customer-specific install logic needed

## Adding a New Customer

To add support for a new customer (e.g., "ABC"):

1. Create `src/assets/environment_abc.js` with the customer configuration
2. Add the customer to `CustomerEnvironmentComponents.cmake`:
   ```cmake
   create_customer_environment_component("abc")
   ```
3. Include `ORDERING_PORTAL_CLIENT_ENV_abc` in the customer's packaging target

## Migration from Old Approach

The old approach used `install(CODE)` scripts that wrote environment.js at install time. This has been replaced with the cleaner component-based approach that installs pre-existing files using CMake's `install(FILES ... RENAME)` feature.

## Testing

You can test the installation of a specific customer environment by running:
```bash
cmake --install . --component ORDERING_PORTAL_CLIENT_ENV_izs
```

This will install only the IZS environment component, placing environment_izs.js as environment.js in the correct location.