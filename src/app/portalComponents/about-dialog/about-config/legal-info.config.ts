export interface LegalInfoItem {
  name: string;
  url: string;
  license: string;
  licenseUrl?: string;
}

export const LEGAL_INFO_CONFIG: LegalInfoItem[] = [
  {
    name: 'libmicrohttpd',
    url: 'https://www.gnu.org/software/libmicrohttpd/',
    license: 'LGPL v2.1',
    licenseUrl: 'https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html',
  },
  {
    name: 'OpenSSL',
    url: 'https://www.openssl.org/',
    license: 'Apache License 2.0',
    licenseUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
  },
];
