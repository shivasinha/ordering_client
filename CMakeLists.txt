project(ordering_portal_client LANGUAGES NONE)
 
set(NG_DEST ${CMAKE_CURRENT_BINARY_DIR}/dist)
set(STAMPFILE_INSTALL ${CMAKE_CURRENT_BINARY_DIR}/ordering_client_install.stamp)
set(STAMPFILE_BUILD ${CMAKE_CURRENT_BINARY_DIR}/ordering_client_build.stamp)
 
# Yarn setup
find_project_yarn(YARN_ORDERING_CLIENT)
 
# Documentation (optional)
component_documentation(README.md)
 
# Include TS + DATA file lists (if needed)
include(ORDERING_PORTAL_WEBAPP.cmake)

# Include customer environment components
include(CustomerEnvironmentComponents.cmake)
 
# Dependency installation
add_custom_command(
  WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
  OUTPUT ${STAMPFILE_INSTALL}
  COMMAND ${HUSH_NATIVE_COMMAND} ${YARN_ORDERING_CLIENT} --immutable
  COMMAND ${CMAKE_COMMAND} -E touch ${STAMPFILE_INSTALL}
  DEPENDS package.json yarn.lock
  VERBATIM
)
add_custom_target(ordering_portal_webapp_install DEPENDS ${STAMPFILE_INSTALL})
 
# Determine build target
if(CMAKE_BUILD_TYPE STREQUAL Debug)
  set(YARN_BUILD_TARGET build)
else()
  set(YARN_BUILD_TARGET build-release)
endif()
 
# Build
add_custom_command(
  WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
  OUTPUT ${STAMPFILE_BUILD}
  COMMAND ${HUSH_NATIVE_COMMAND} ${YARN_ORDERING_CLIENT} run ${YARN_BUILD_TARGET} --output-path ${NG_DEST}
  COMMAND ${CMAKE_COMMAND} -E touch ${STAMPFILE_BUILD}
  DEPENDS ${ORDERING_PORTAL_WEBAPP_TS} ${ORDERING_PORTAL_WEBAPP_DATA} ordering_portal_webapp_install
  VERBATIM
)
add_custom_target(ordering_portal_webapp ${WEBCLIENTS_ADDITIONAL_PARAMETERS} DEPENDS ${STAMPFILE_BUILD})
 
# TPS integration
tps_add_target_to_component(ordering_portal_webapp ORDERING_PORTAL_CLIENT)
 
# Install dist folder
install(DIRECTORY ${NG_DEST}/ DESTINATION "ordering_frontend" COMPONENT ORDERING_PORTAL_CLIENT)
 
# Lint target
add_custom_target(
  lint_ordering_client
  WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
  COMMAND ${YARN_ORDERING_CLIENT} run lint:ci
  DEPENDS ordering_portal_webapp_install
)
add_dependencies(lint_webclients lint_ordering_client)
 
# Unit test target
add_custom_target(
  tests_ordering_client
  WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
  COMMAND ${YARN_ORDERING_CLIENT} run test:ci
  DEPENDS ordering_portal_webapp_install
)
add_dependencies(unittests_webclients tests_ordering_client)
