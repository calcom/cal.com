
import { it, expect, describe, beforeAll } from "vitest";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getSubdomainRegExp } = require("../../getSubdomainRegExp");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {match, pathToRegexp} = require("next/dist/compiled/path-to-regexp");
type MatcherRes = (path: string) => {params: Record<string, string>}
let userTypeRouteMatch: MatcherRes;
let teamTypeRouteMatch:MatcherRes;
let privateLinkRouteMatch:MatcherRes
let embedUserTypeRouteMatch:MatcherRes
let embedTeamTypeRouteMatch:MatcherRes
let orgUserTypeRouteMatch:MatcherRes
let orgUserRouteMatch: MatcherRes


beforeAll(async()=>{
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  process.env.NEXT_PUBLIC_WEBAPP_URL = "http://example.com"
  const {
    userTypeRoutePath,
    teamTypeRoutePath,
    privateLinkRoutePath,
    embedUserTypeRoutePath,
    embedTeamTypeRoutePath,
    orgUserRoutePath,
    orgUserTypeRoutePath,
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  } = require("../../pagesAndRewritePaths")

  userTypeRouteMatch = match(userTypeRoutePath);
  
  teamTypeRouteMatch = match(teamTypeRoutePath);

  privateLinkRouteMatch = match(privateLinkRoutePath);
  
  embedUserTypeRouteMatch = match(embedUserTypeRoutePath);
  
  embedTeamTypeRouteMatch = match(embedTeamTypeRoutePath);

  orgUserTypeRouteMatch = match(orgUserTypeRoutePath)

  orgUserRouteMatch = match(orgUserRoutePath)
  console.log({
    regExps: {
      userTypeRouteMatch: pathToRegexp(userTypeRoutePath),
  
      teamTypeRouteMatch:pathToRegexp(teamTypeRoutePath),
    
      privateLinkRouteMatch:pathToRegexp(privateLinkRoutePath),
      
      embedUserTypeRouteMatch:pathToRegexp(embedUserTypeRoutePath),
      
      embedTeamTypeRouteMatch:pathToRegexp(embedTeamTypeRoutePath),
    
      orgUserTypeRouteMatch:pathToRegexp(orgUserTypeRoutePath),
    
      orgUserRouteMatch:pathToRegexp(orgUserRoutePath)
    }
  })
});

describe('next.config.js - RegExp', ()=>{
	it("Booking Urls", async () => {
		expect(userTypeRouteMatch('/free/30')?.params).toContain({
			user: 'free',
			type: '30'
		})
		
    // Edgecase of username starting with team also works
    expect(userTypeRouteMatch('/teampro/30')?.params).toContain({
			user: 'teampro',
			type: '30'
		})

    // Edgecase of username starting with team also works
    expect(userTypeRouteMatch('/workflowteam/30')?.params).toContain({
      user: 'workflowteam',
      type: '30'
    })

    expect(userTypeRouteMatch('/teampro+pro/30')?.params).toContain({
      user: 'teampro+pro',
      type: '30'
    })

    expect(userTypeRouteMatch('/teampro+pro/book')).toEqual(false)

    // Because /book doesn't have a corresponding new-booker route.
    expect(userTypeRouteMatch('/free/book')).toEqual(false)

    // Because /booked is a normal event name
    expect(userTypeRouteMatch('/free/booked')?.params).toEqual({
			user: 'free',
			type: 'booked'
		})
    

    expect(embedUserTypeRouteMatch('/free/30/embed')?.params).toContain({
      user: 'free',
      type:'30'
    })

    // Edgecase of username starting with team also works
    expect(embedUserTypeRouteMatch('/teampro/30/embed')?.params).toContain({
			user: 'teampro',
			type: '30'
		})

    expect(teamTypeRouteMatch('/team/seeded/30')?.params).toContain({
			slug: 'seeded',
			type: '30'
		})
    
    // Because /book doesn't have a corresponding new-booker route.
    expect(teamTypeRouteMatch('/team/seeded/book')).toEqual(false)

    expect(teamTypeRouteMatch('/team/seeded/30/embed')).toEqual(false)

    expect(embedTeamTypeRouteMatch('/team/seeded/30/embed')?.params).toContain({
      slug: 'seeded',
      type:'30'
    })

		expect(privateLinkRouteMatch('/d/3v4s321CXRJZx5TFxkpPvd/30min')?.params).toContain({
			link: '3v4s321CXRJZx5TFxkpPvd',
			slug: '30min'
		})

    expect(privateLinkRouteMatch('/d/3v4s321CXRJZx5TFxkpPvd/30min')?.params).toContain({
			link: '3v4s321CXRJZx5TFxkpPvd',
			slug: '30min'
		})

    // Because /book doesn't have a corresponding new-booker route.
    expect(privateLinkRouteMatch('/d/3v4s321CXRJZx5TFxkpPvd/book')).toEqual(false)
	});

  it('Non booking Urls', ()=>{

    expect(userTypeRouteMatch('/404/')).toEqual(false)
    expect(teamTypeRouteMatch('/404/')).toEqual(false)

    expect(userTypeRouteMatch('/404/30')).toEqual(false)
    expect(teamTypeRouteMatch('/404/30')).toEqual(false)

    expect(userTypeRouteMatch('/api')).toEqual(false)
    expect(teamTypeRouteMatch('/api')).toEqual(false)

    expect(userTypeRouteMatch('/api/30')).toEqual(false)
    expect(teamTypeRouteMatch('/api/30')).toEqual(false)

    expect(userTypeRouteMatch('/workflows/30')).toEqual(false)
    expect(teamTypeRouteMatch('/workflows/30')).toEqual(false)

    expect(userTypeRouteMatch('/event-types/30')).toEqual(false)
    expect(teamTypeRouteMatch('/event-types/30')).toEqual(false)

    expect(userTypeRouteMatch('/teams/1')).toEqual(false)
    expect(teamTypeRouteMatch('/teams/1')).toEqual(false)

    expect(userTypeRouteMatch('/teams')).toEqual(false)
    expect(teamTypeRouteMatch('/teams')).toEqual(false)

    // Note that even though it matches /embed/embed.js, but it's served from /public and the regexes are in afterEach, it won't hit the flow.
    // expect(userTypeRouteRegExp('/embed/embed.js')).toEqual(false)
    // expect(teamTypeRouteRegExp('/embed/embed.js')).toEqual(false)
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
      expect(orgUserTypeRouteMatch('/user/type')?.params).toContain({
        user: 'user',
        type: 'type'
      })
      
      // User slug starting with 404(which is a page route) will work
      expect(orgUserTypeRouteMatch('/404a/def')?.params).toEqual({
        user: '404a',
        type: 'def'
      })

      // Team Page won't match - There is no /team prefix required for Org team event pages
      expect(orgUserTypeRouteMatch('/team/abc')).toEqual(false)

      expect(orgUserTypeRouteMatch('/abc')).toEqual(false)

      expect(orgUserRouteMatch('/abc')?.params).toContain({
        user: 'abc'
      })
    })

    it('Non booking pages', () => {
      expect(orgUserTypeRouteMatch('/_next/def')).toEqual(false)
      expect(orgUserTypeRouteMatch('/public/def')).toEqual(false)
      expect(orgUserRouteMatch('/_next/')).toEqual(false)
      expect(orgUserRouteMatch('/public/')).toEqual(false)
      expect(orgUserRouteMatch('/event-types')).toEqual(false)
      expect(orgUserTypeRouteMatch('/event-types')).toEqual(false)
      expect(orgUserTypeRouteMatch('/john/avatar.png')).toEqual(false)
      expect(orgUserTypeRouteMatch('/cancel/abcd')).toEqual(false)
      expect(orgUserTypeRouteMatch('/success/abcd')).toEqual(false)
      expect(orgUserRouteMatch('/forms/xdsdf-sd')).toEqual(false)
      expect(orgUserRouteMatch('/router?form=')).toEqual(false)
    })
  })
})