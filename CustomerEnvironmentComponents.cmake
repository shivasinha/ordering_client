# Customer environment components for ordering portal client
# This module provides install rules for customer-specific environment.js files
# following Magnus's suggestion for better scalability and maintainability

# Install customer-specific environment files conditionally
# Each install rule checks if the package name matches the customer

# BDK Customer environment
install( FILES ${CMAKE_CURRENT_SOURCE_DIR}/src/environments/environment_bdk.js
         DESTINATION "ordering_frontend/browser/assets"
         RENAME "environment.js"
         COMPONENT BDK_PORTAL_CLIENT )

# BDK Customer assets (logos, favicon, etc.)
install( DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/src/assets/customers/bdk/
         DESTINATION "ordering_frontend/browser/assets"
         COMPONENT BDK_PORTAL_CLIENT )

# HACON Customer assets (logos, favicon, etc.)
install( DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/src/assets/customers/hacon/
         DESTINATION "ordering_frontend/browser/assets"
         COMPONENT HACON_PORTAL_CLIENT )

# HACON Customer environment  
install( FILES ${CMAKE_CURRENT_SOURCE_DIR}/src/environments/environment_hacon.js
         DESTINATION "ordering_frontend/browser/assets"
         RENAME "environment.js"
         COMPONENT HACON_PORTAL_CLIENT )

# IZS Customer environment
install( FILES ${CMAKE_CURRENT_SOURCE_DIR}/src/environments/environment_izs.js
         DESTINATION "ordering_frontend/browser/assets"
         RENAME "environment.js"
         COMPONENT IZS_PORTAL_CLIENT )

# IZS Customer assets (logos, favicon, etc.)
install( DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/src/assets/customers/izs/
         DESTINATION "ordering_frontend/browser/assets"
         COMPONENT IZS_PORTAL_CLIENT )

# SZ Customer environment  
install( FILES ${CMAKE_CURRENT_SOURCE_DIR}/src/environments/environment_sz.js
         DESTINATION "ordering_frontend/browser/assets"
         RENAME "environment.js"
         COMPONENT SZ_PORTAL_CLIENT )

# SZ Customer assets (logos, favicon, etc.)
install( DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/src/assets/customers/sz/
         DESTINATION "ordering_frontend/browser/assets"
         COMPONENT SZ_PORTAL_CLIENT )

