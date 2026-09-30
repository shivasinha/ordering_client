import { Component, effect, inject, OnInit, signal, OnDestroy, WritableSignal, untracked } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { Configuration } from '@Ordering/api';

import { ClientAuthenticationService } from '@Ordering/auth/services/client-authentication.service';
import { AuthMonitorService } from '@Ordering/auth/services/auth-monitor.service';
import { SSOAuthenticationService } from '@Ordering/auth/services/sso/sso-authentication.service';
import { AppToolbarComponent } from '@Ordering/portalComponents/app-toolbar/app-toolbar.component';
import { LoadingSpinnerService } from '@Ordering/shared/services/loading-spinner.service';
import { LoadingSpinnerComponent } from '@Ordering/shared/components/loading-spinner/loading-spinner.component';
import { BreadcrumbComponent } from '@Ordering/shared/components/breadcrumb/breadcrumb.component';
import { MasterDataHandlingService } from './shared/services/master-data-handling.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-root',
  imports: [RouterModule, AppToolbarComponent, LoadingSpinnerComponent, BreadcrumbComponent],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit, OnDestroy {
  private authMonitorService = inject(AuthMonitorService);
  private rpConfig: Configuration = inject(Configuration);
  private masterDataHandlingService: MasterDataHandlingService = inject(MasterDataHandlingService);
  protected loadingSpinnerService: LoadingSpinnerService = inject(LoadingSpinnerService);
  protected clientAuthService: ClientAuthenticationService = inject(ClientAuthenticationService);
  protected isLoadingConfigSig: WritableSignal<boolean> = signal<boolean>(false);
  private readonly ssoAuthenticationService: SSOAuthenticationService = inject(SSOAuthenticationService);
  protected router: Router = inject(Router);

  constructor() {
    this.clientAuthService.isLoggedIn = this.clientAuthService.isUserInfoExist();
    this.isLoadingConfigSig.set(true);
    const queryParams: URLSearchParams = new URLSearchParams(window.location.search);
    this.ssoAuthenticationService.isSsoAuthCallback = queryParams;
    if (this.clientAuthService.isLoggedIn) {
      // Start authentication monitoring for logged-in users
      this.authMonitorService.startMonitoring();

      effect(() => {
        this.isLoadingConfigSig.set(false);
        untracked(() => this.masterDataHandlingService.fetchAllMasterData());
      });
    } else if (this.ssoAuthenticationService.isSsoAuthCallback()) {
      this.ssoAuthenticationService.handleRedirect();
      this.isLoadingConfigSig.set(false);
    } else {
      this.isLoadingConfigSig.set(false);
      this.clientAuthService.resetAndNavigateToLogin();
    }
  }

  ngOnInit(): void {
    this.rpConfig.basePath = environment.restBaseURI;
  }

  ngOnDestroy(): void {
    // Clean up monitoring service
    this.authMonitorService.stopMonitoring();
  }
}
