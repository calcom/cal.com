
import { it, expect, describe, beforeAll, afterAll } from "vitest";
let userTypeRouteRegExp: RegExp;
let teamTypeRouteRegExp:RegExp;
let privateLinkRouteRegExp:RegExp
let embedUserTypeRouteRegExp:RegExp
let embedTeamTypeRouteRegExp:RegExp


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

describe('next.config.js - RegExp', ()=>{
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
  });
  
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

