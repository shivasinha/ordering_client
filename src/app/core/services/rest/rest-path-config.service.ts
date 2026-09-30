// IMPORTS
// -------------------------------------------------------------------------------------------------
import { Injectable } from '@angular/core';

// INJECTABLE
// -------------------------------------------------------------------------------------------------
@Injectable({
  providedIn: 'root',
})
export class RestPathConfigService {
  // VARIABLES
  // -------------------------------------------------------------------------------------------------

  // Base URI for all REST Services
  private restBaseURI: string = '';
  private restPaths: Map<string, string> | undefined;

  // SERVICE FUNCTIONS
  // -------------------------------------------------------------------------------------------------
  public configureRestApi(restBaseURI: string): void {
    this.restBaseURI = restBaseURI;
  }

  public getRestPrefix(): string {
    return this.restBaseURI;
  }

  /**
   * Get rest endpoint including url
   *
   * @returns {string}
   */
  public getRestPath(): string {
    return this.restBaseURI;
    // if (this.restPaths?.has(rpName)) {
    //   if (projectID && projectID != null) {
    //     return this.restBaseURI + projectID + this.restPaths.get(rpName);
    //   } else {
    //     return this.restBaseURI + this.restPaths.get(rpName);
    //   }
    // }
    // throw new Error('No such Map Entry: ' + rpName);
  }
}
