import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

import { environment } from './environments/environment';
import { configureDayjs } from './app/utils/dayjs-config';
import { resolveEnabledModuleProviders } from './app/shared/config/module-providers.config';

// Configure dayjs plugins
configureDayjs();

if (environment.production) {
  enableProdMode();
}

// Dynamically resolve only the enabled order-item modules before bootstrap.
// Disabled modules are not loaded and remain in separate chunks (tree-shaken).
// TODO: When backend delivers Config.enabledModules, fetch the config here
// (e.g. via fetch('/rest/config')) and pass the enabled IDs to
// resolveEnabledModuleProviders(enabledIds) before bootstrap.
resolveEnabledModuleProviders().then(moduleProviders => {
  bootstrapApplication(AppComponent, {
    ...appConfig,
    providers: [...appConfig.providers, ...moduleProviders],
  }).catch(err => console.error(err));
});
