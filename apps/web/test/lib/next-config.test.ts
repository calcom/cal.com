
import { it, expect, describe, beforeAll, afterAll } from "vitest";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getSubdomainRegExp } = require("../../getSubdomainRegExp");
let userTypeRouteRegExp: RegExp;
let teamTypeRouteRegExp:RegExp;
let privateLinkRouteRegExp:RegExp
let embedUserTypeRouteRegExp:RegExp
let embedTeamTypeRouteRegExp:RegExp
let orgUserTypeRouteRegExp:RegExp
let orgUserRouteRegExp:RegExp
const getRegExpFromNextJsRewriteRegExp = (nextJsRegExp:string) => {
  // const parts = nextJsRegExp.split(':');
  
  // const validNamedGroupRegExp =  parts.map((part, index)=>{
  //   if (index === 0) {
  //     return part;
  //   }
  //   if (part.match(/^[a-zA-Z0-9]+$/)) {
  //     return `(?<${part}>[^/]+)`
  //   }
  //   part = part.replace(new RegExp('([^(]+)(.*)'), '(?<$1>$2)');
  //   return part
  // }).join('');

  // TODO: If we can easily convert the exported rewrite regexes from next.config.js to a valid named capturing group regex, it would be best
  // Next.js does an exact match as per my testing.
  return new RegExp(`^${nextJsRegExp}$`)
}

beforeAll(async()=>{
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // process.env.NEXTAUTH_SECRET =  process.env.NEXTAUTH_URL = process.env.CALENDSO_ENCRYPTION_KEY = 1
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pages = require("../../pages").pages

  // How to convert a Next.js rewrite RegExp/wildcard to a valid JS named capturing Group RegExp?
  // -  /:user/ -> (?<user>[^/]+)
  // -  /:user(?!404)[^/]+/ -> (?<user>((?!404)[^/]+))

  // userTypeRouteRegExp = `/:user((?!${pages.join("/|")})[^/]*)/:type((?!book$)[^/]+)`;
  userTypeRouteRegExp = getRegExpFromNextJsRewriteRegExp(`/(?<user>((?!${pages.join("/|")})[^/]*))/(?<type>((?!book$)[^/]+))`);
  
  // teamTypeRouteRegExp = "/team/:slug/:type((?!book$)[^/]+)";
  teamTypeRouteRegExp = getRegExpFromNextJsRewriteRegExp("/team/(?<slug>[^/]+)/(?<type>((?!book$)[^/]+))");

  // privateLinkRouteRegExp = "/d/:link/:slug((?!book$)[^/]+)";
  privateLinkRouteRegExp = getRegExpFromNextJsRewriteRegExp("/d/(?<link>[^/]+)/(?<slug>((?!book$)[^/]+))");
  
  // embedUserTypeRouteRegExp = `/:user((?!${pages.join("/|")})[^/]*)/:type/embed`;
  embedUserTypeRouteRegExp = getRegExpFromNextJsRewriteRegExp(`/(?<user>((?!${pages.join("/|")})[^/]*))/(?<type>[^/]+)/embed`);
  
  // embedTeamTypeRouteRegExp = "/team/:slug/:type/embed";
  embedTeamTypeRouteRegExp = getRegExpFromNextJsRewriteRegExp("/team/(?<slug>[^/]+)/(?<type>[^/]+)/embed");

  // orgUserTypeRouteRegExp = "/:user((?!${pages.join("/|")}|_next|public)[^/]+)/:type"
  orgUserTypeRouteRegExp = getRegExpFromNextJsRewriteRegExp(`/(?<user>((?!${pages.join("/|")}|_next|public)[^/]+))/(?<type>[^/]+)`)

  // orgUserRouteRegExp = `/:user((?!${pages.join("/|")}|_next|public)[a-zA-Z0-9\-_]+)`;
  orgUserRouteRegExp = getRegExpFromNextJsRewriteRegExp(`/(?<user>((?!${pages.join("/|")}|_next|public)[a-zA-Z0-9\-_]+))`)
});

describe('next.config.js - RegExp', ()=>{
  afterAll(()=>{
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_URL = process.env.CALENDSO_ENCRYPTION_KEY = undefined
  })

	it("Booking Urls", async () => {
		expect(userTypeRouteRegExp.exec('/free/30')?.groups).toContain({
			user: 'free',
			type: '30'
		})
		
    // Edgecase of username starting with team also works
    expect(userTypeRouteRegExp.exec('/teampro/30')?.groups).toContain({
			user: 'teampro',
			type: '30'
		})

    expect(userTypeRouteRegExp.exec('/teampro+pro/30')?.groups).toContain({
      user: 'teampro+pro',
      type: '30'
    })

    expect(userTypeRouteRegExp.exec('/teampro+pro/book')).toEqual(null)

    // Because /book doesn't have a corresponding new-booker route.
    expect(userTypeRouteRegExp.exec('/free/book')).toEqual(null)

    // Because /booked is a normal event name
    expect(userTypeRouteRegExp.exec('/free/booked')?.groups).toEqual({
			user: 'free',
			type: 'booked'
		})
    

    expect(embedUserTypeRouteRegExp.exec('/free/30/embed')?.groups).toContain({
      user: 'free',
      type:'30'
    })

    // Edgecase of username starting with team also works
    expect(embedUserTypeRouteRegExp.exec('/teampro/30/embed')?.groups).toContain({
			user: 'teampro',
			type: '30'
		})

    expect(teamTypeRouteRegExp.exec('/team/seeded/30')?.groups).toContain({
			slug: 'seeded',
			type: '30'
		})
    
    // Because /book doesn't have a corresponding new-booker route.
    expect(teamTypeRouteRegExp.exec('/team/seeded/book')).toEqual(null)

    expect(teamTypeRouteRegExp.exec('/team/seeded/30/embed')).toEqual(null)

    expect(embedTeamTypeRouteRegExp.exec('/team/seeded/30/embed')?.groups).toContain({
      slug: 'seeded',
      type:'30'
    })

		expect(privateLinkRouteRegExp.exec('/d/3v4s321CXRJZx5TFxkpPvd/30min')?.groups).toContain({
			link: '3v4s321CXRJZx5TFxkpPvd',
			slug: '30min'
		})

    expect(privateLinkRouteRegExp.exec('/d/3v4s321CXRJZx5TFxkpPvd/30min')?.groups).toContain({
			link: '3v4s321CXRJZx5TFxkpPvd',
			slug: '30min'
		})

    // Because /book doesn't have a corresponding new-booker route.
    expect(privateLinkRouteRegExp.exec('/d/3v4s321CXRJZx5TFxkpPvd/book')).toEqual(null)
	});

  it('Non booking Urls', ()=>{

    expect(userTypeRouteRegExp.exec('/404')).toEqual(null)
    expect(teamTypeRouteRegExp.exec('/404')).toEqual(null)

    expect(userTypeRouteRegExp.exec('/404/30')).toEqual(null)
    expect(teamTypeRouteRegExp.exec('/404/30')).toEqual(null)

    expect(userTypeRouteRegExp.exec('/api')).toEqual(null)
    expect(teamTypeRouteRegExp.exec('/api')).toEqual(null)

    expect(userTypeRouteRegExp.exec('/api/30')).toEqual(null)
    expect(teamTypeRouteRegExp.exec('/api/30')).toEqual(null)

    expect(userTypeRouteRegExp.exec('/workflows/30')).toEqual(null)
    expect(teamTypeRouteRegExp.exec('/workflows/30')).toEqual(null)

    expect(userTypeRouteRegExp.exec('/event-types/30')).toEqual(null)
    expect(teamTypeRouteRegExp.exec('/event-types/30')).toEqual(null)

    expect(userTypeRouteRegExp.exec('/teams/1')).toEqual(null)
    expect(teamTypeRouteRegExp.exec('/teams/1')).toEqual(null)

    expect(userTypeRouteRegExp.exec('/teams')).toEqual(null)
    expect(teamTypeRouteRegExp.exec('/teams')).toEqual(null)

    // Note that even though it matches /embed/embed.js, but it's served from /public and the regexes are in afterEach, it won't hit the flow.
    // expect(userTypeRouteRegExp.exec('/embed/embed.js')).toEqual(null)
    // expect(teamTypeRouteRegExp.exec('/embed/embed.js')).toEqual(null)
  })
})


describe('next.config.js - Org Rewrite', ()=> {
  // RegExp copied from next.config.js
  const orgHostRegExp = (subdomainRegExp:string)=> new RegExp(`^(?<orgSlug>${subdomainRegExp})\\..*`)
  describe('Host matching based on NEXT_PUBLIC_WEBAPP_URL', ()=>{
    it('https://app.cal.com', ()=>{
      const subdomainRegExp = getSubdomainRegExp('https://app.cal.com');
      expect(orgHostRegExp(subdomainRegExp).exec('app.cal.com')).toEqual(null)
      expect(orgHostRegExp(subdomainRegExp).exec('company.app.cal.com')?.groups?.orgSlug).toEqual('company')
      expect(orgHostRegExp(subdomainRegExp).exec('org.cal.com')?.groups?.orgSlug).toEqual('org')
    })

    it('app.cal.com', ()=>{
      const subdomainRegExp = getSubdomainRegExp('app.cal.com');
      expect(orgHostRegExp(subdomainRegExp).exec('app.cal.com')).toEqual(null)
      expect(orgHostRegExp(subdomainRegExp).exec('company.app.cal.com')?.groups?.orgSlug).toEqual('company')
    })

    it('https://calcom.app.company.com', ()=>{
      const subdomainRegExp = getSubdomainRegExp('https://calcom.app.company.com');
      expect(orgHostRegExp(subdomainRegExp).exec('calcom.app.company.com')).toEqual(null)
      expect(orgHostRegExp(subdomainRegExp).exec('acme.calcom.app.company.com')?.groups?.orgSlug).toEqual('acme')
    })

    it('https://calcom.example.com', ()=>{
      const subdomainRegExp = getSubdomainRegExp('https://calcom.example.com');
      expect(orgHostRegExp(subdomainRegExp).exec('calcom.example.com')).toEqual(null)
      expect(orgHostRegExp(subdomainRegExp).exec('acme.calcom.example.com')?.groups?.orgSlug).toEqual('acme')
      // The following also matches which causes anything other than the domain in NEXT_PUBLIC_WEBAPP_URL to give 404
      expect(orgHostRegExp(subdomainRegExp).exec('some-other.company.com')?.groups?.orgSlug).toEqual('some-other')
    })
  })

  describe('Rewrite', () =>{ 
    it('booking pages', () => {
      expect(orgUserTypeRouteRegExp.exec('/user/type')?.groups).toContain({
        user: 'user',
        type: 'type'
      })
      
      // User slug starting with 404(which is a page route) will work
      expect(orgUserTypeRouteRegExp.exec('/404a/def')?.groups).toEqual({
        user: '404a',
        type: 'def'
      })

      // Team Page won't match - There is no /team prefix required for Org team event pages
      expect(orgUserTypeRouteRegExp.exec('/team/abc')).toEqual(null)

      expect(orgUserTypeRouteRegExp.exec('/abc')).toEqual(null)

      expect(orgUserRouteRegExp.exec('/abc')?.groups).toContain({
        user: 'abc'
      })
    })

    it('Non booking pages', () => {
      expect(orgUserTypeRouteRegExp.exec('/_next/def')).toEqual(null)
      expect(orgUserTypeRouteRegExp.exec('/public/def')).toEqual(null)
      expect(orgUserRouteRegExp.exec('/_next')).toEqual(null)
      expect(orgUserRouteRegExp.exec('/public')).toEqual(null)
    })
  })
})