export enum ExchangeAuthentication {
  STANDARD = 0,
  NTLM = 1,
}
/**
 * Defines the each available Exchange release version
 * Copied from https://github.com/gautamsi/ews-javascript-api/blob/378b7c45fd7518312fd22c27d3d254a0dc1876c0/src/js/Enumerations/ExchangeVersion.ts
 * Due to issue with importing library into browser context, 
 * resolved to copy it instead of loading whole module into browser context
 */
export enum ExchangeVersion {
    /**
     * Microsoft Exchange 2007, Service Pack 1
     */
    Exchange2007_SP1 = 0,
    /**
     * Microsoft Exchange 2010
     */
    Exchange2010 = 1,
    /**
     * Microsoft Exchange 2010, Service Pack 1
     */
    Exchange2010_SP1 = 2,
    /**
     * Microsoft Exchange 2010, Service Pack 2
     */
    Exchange2010_SP2 = 3,
    /**
     * Microsoft Exchange 2013
     */
    Exchange2013 = 4,
    /**
     * Microsoft Exchange 2013 SP1
     */
    Exchange2013_SP1 = 5,
    /**
     * Microsoft Exchange 2015 (aka Exchange 2016)
     */
    Exchange2015 = 6,
    /**
     * Microsoft Exchange 2016
     */
    Exchange2016 = 7
}

