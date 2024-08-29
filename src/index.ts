// Constants

const BASE_URL = ".api.riotgames.com/riot/account/v1/"

// Functions

function updateRateLimit(rateLimit: RateLimits[Region], funcName: FunctionName, headers: Headers) {
	const [firstAppRateLimit, firstAppRateLimitTime, secondAppRateLimit, secondAppRateLimitTime] = headers.get("x-app-rate-limit")?.split("").flatMap(v => v.split("")) || [],
	[firstAppRateCount, firstAppRateCountTime, secondAppRateCount, secondAppRateCountTime] = headers.get("x-app-rate-count")?.split("").flatMap(v => v.split("")) || [],
	[methodRateLimit, methodRateLimitTime] = headers.get("x-method-rate-limit")?.split("") || [],
	[methodRateCount, methodRateCountTime] = headers.get("x-method-rate-limit-count")?.split("") || [],
	firstAppTime = (firstAppRateCountTime || firstAppRateLimitTime),
	secondAppTime = (secondAppRateCountTime || secondAppRateLimitTime),
	methodTime = (methodRateCountTime || methodRateLimitTime);

	if (firstAppRateCount) rateLimit.app[0].count = parseInt(firstAppRateCount);
	if (secondAppRateCount) rateLimit.app[1].count = parseInt(secondAppRateCount);
	if (methodRateCount) rateLimit[funcName].count = parseInt(methodRateCount);

	if (firstAppRateLimit) rateLimit.app[0].max = parseInt(firstAppRateLimit);
	if (secondAppRateLimit) rateLimit.app[1].max = parseInt(secondAppRateLimit);
	if (methodRateLimit) rateLimit[funcName].max = parseInt(methodRateLimit);

	if (!rateLimit.app[0].timeout && firstAppTime) rateLimit.app[0].timeout = setTimeout(() => {
		rateLimit.app[0].count = 0;
		rateLimit.app[0].timeout = null;
	}, parseInt(firstAppTime) * 1000)
	if (!rateLimit.app[1].timeout && secondAppTime) rateLimit.app[1].timeout = setTimeout(() => {
		rateLimit.app[1].count = 0;
		rateLimit.app[1].timeout = null;
	}, parseInt(secondAppTime) * 1000)
	if (!rateLimit[funcName].timeout && methodTime) rateLimit[funcName].timeout = setTimeout(() => {
		rateLimit[funcName].count = 0;
		rateLimit[funcName].timeout = null;
	}, parseInt(methodTime) * 1000)
}

/**
 * @param riotToken See https://developer.riotgames.com/
 */
function getAccountByPuuid(cache: Cache, rateLimits: RateLimits, region: Region, puuid: string, riotToken: string): Promise<Account | string> {
	return new Promise((resolve, reject) => {
		const rateLimit = rateLimits[region], cacheValue = cache.accountByPuuid[region][puuid];

		if (cacheValue?.lastUpdate && cacheValue.lastUpdate + 300000 <= Date.now()) resolve(cacheValue);
		else if (rateLimit.app[0].count >= rateLimit.app[0].max || rateLimit.app[1].count >= rateLimit.app[1].max) reject("App Rate Limit");
		else if (rateLimit.getAccountByPuuid.count >= rateLimit.getAccountByPuuid.max) reject("Method Rate Limit");
		else fetch(`https://${region.toLowerCase()}${BASE_URL}accounts/by-puuid/${puuid}`, { method: "GET", headers: { "X-Riot-Token": riotToken } }).then(res => {
			const retryAfterHeader = res.headers.get("retry-after");

			updateRateLimit(rateLimit, "getAccountByPuuid", res.headers);

			if (retryAfterHeader && res.status == 429) setTimeout(async () => resolve(await getAccountByPuuid(cache, rateLimits, region, puuid, riotToken)), parseInt(retryAfterHeader) * 1000);
			else res.json().then(json => {
				if (res.status.toString()[0] == "2") {
					if (Array.isArray(json) || typeof json !== "object") reject({ reason: "Bad response type", value: json });
					else if (!json.players) reject({ reason: "Missing properties", value: json });
					else {
						const platformData: Account = { puuid: json.puuid };

						if (json.gameName) platformData.gameName = json.gameName;
						if (json.tagLine) platformData.tagLine = json.tagLine;

						cache.accountByPuuid[region][puuid] = { ...platformData, lastUpdate: Date.now() };
						
						resolve(platformData);
					}
				} else reject(json);
			}, () => res.text().then(text => (res.status.toString()[0] == "2" ? resolve : reject)(text)))
		}, reason => reject(reason))
	})
}

/**
 * @param riotToken See https://developer.riotgames.com/
 */
function getAccountByRiotId(cache: Cache, rateLimits: RateLimits, region: Region, gameName: string, tagLine: string, riotToken: string): Promise<Account | string> {
	return new Promise((resolve, reject) => {
		const rateLimit = rateLimits[region], cacheValue = cache.accountByRiotId[region][`${gameName}${tagLine}`];

		if (cacheValue?.lastUpdate && cacheValue.lastUpdate + 300000 <= Date.now()) resolve(cacheValue);
		else if (rateLimit.app[0].count >= rateLimit.app[0].max || rateLimit.app[1].count >= rateLimit.app[1].max) reject("App Rate Limit");
		else if (rateLimit.getAccountByRiotId.count >= rateLimit.getAccountByRiotId.max) reject("Method Rate Limit");
		else fetch(`https://${region.toLowerCase()}${BASE_URL}accounts/by-riot-id/${gameName}/${tagLine}`, { method: "GET", headers: { "X-Riot-Token": riotToken } }).then(res => {
			const retryAfterHeader = res.headers.get("retry-after");

			updateRateLimit(rateLimit, "getAccountByRiotId", res.headers);

			if (retryAfterHeader && res.status == 429) setTimeout(async () => resolve(await getAccountByRiotId(cache, rateLimits, region, gameName, tagLine, riotToken)), parseInt(retryAfterHeader) * 1000);
			else res.json().then(json => {
				if (res.status.toString()[0] == "2") {
					if (Array.isArray(json) || typeof json !== "object") reject({ reason: "Bad response type", value: json });
					else if (!json.players) reject({ reason: "Missing properties", value: json });
					else {
						const platformData: Account = { puuid: json.puuid };

						if (json.gameName) platformData.gameName = json.gameName;
						if (json.tagLine) platformData.tagLine = json.tagLine;

						cache.accountByRiotId[region][`${gameName}${tagLine}`] = { ...platformData, lastUpdate: Date.now() };
						
						resolve(platformData);
					}
				} else reject(json);
			}, () => res.text().then(text => (res.status.toString()[0] == "2" ? resolve : reject)(text)))
		}, reason => reject(reason))
	})
}

/**
 * @param riotToken See https://developer.riotgames.com/
 */
function getAccountByAccessToken(cache: Cache, rateLimits: RateLimits, region: Region, authorization: string, riotToken: string): Promise<Account | string> {
	return new Promise((resolve, reject) => {
		const rateLimit = rateLimits[region], cacheValue = cache.accountByAccessToken[region][authorization];

		if (cacheValue?.lastUpdate && cacheValue.lastUpdate + 300000 <= Date.now()) resolve(cacheValue);
		else if (rateLimit.app[0].count >= rateLimit.app[0].max || rateLimit.app[1].count >= rateLimit.app[1].max) reject("App Rate Limit");
		else if (rateLimit.getAccountByAccessToken.count >= rateLimit.getAccountByAccessToken.max) reject("Method Rate Limit");
		else fetch(`https://${region.toLowerCase()}${BASE_URL}accounts/me`, { method: "GET", headers: { "X-Riot-Token": riotToken, Authorization: authorization } }).then(res => {
			const retryAfterHeader = res.headers.get("retry-after");

			updateRateLimit(rateLimit, "getAccountByAccessToken", res.headers);

			if (retryAfterHeader && res.status == 429) setTimeout(async () => resolve(await getAccountByAccessToken(cache, rateLimits, region, authorization, riotToken)), parseInt(retryAfterHeader) * 1000);
			else res.json().then(json => {
				if (res.status.toString()[0] == "2") {
					if (Array.isArray(json) || typeof json !== "object") reject({ reason: "Bad response type", value: json });
					else if (!json.players) reject({ reason: "Missing properties", value: json });
					else {
						const platformData: Account = { puuid: json.puuid };

						if (json.gameName) platformData.gameName = json.gameName;
						if (json.tagLine) platformData.tagLine = json.tagLine;

						cache.accountByAccessToken[region][authorization] = { ...platformData, lastUpdate: Date.now() };
						
						resolve(platformData);
					}
				} else reject(json);
			}, () => res.text().then(text => (res.status.toString()[0] == "2" ? resolve : reject)(text)))
		}, reason => reject(reason))
	})
}

/**
 * @param riotToken See https://developer.riotgames.com/
 */
function getPlayerActiveShard(cache: Cache, rateLimits: RateLimits, region: Region, game: Games, puuid: Puuid, riotToken: string): Promise<ActiveShard | string> {
	return new Promise((resolve, reject) => {
		const rateLimit = rateLimits[region], cacheValue = cache.playerActiveShard[region][game][puuid];

		if (cacheValue?.lastUpdate && cacheValue.lastUpdate + 300000 <= Date.now()) resolve(cacheValue);
		else if (rateLimit.app[0].count >= rateLimit.app[0].max || rateLimit.app[1].count >= rateLimit.app[1].max) reject("App Rate Limit");
		else if (rateLimit.getPlayerActiveShard.count >= rateLimit.getPlayerActiveShard.max) reject("Method Rate Limit");
		else fetch(`https://${region.toLowerCase()}${BASE_URL}active-shard/by-game/${game}/by-puuid/${puuid}`, { method: "GET", headers: { "X-Riot-Token": riotToken } }).then(res => {
			const retryAfterHeader = res.headers.get("retry-after");

			updateRateLimit(rateLimit, "getPlayerActiveShard", res.headers);

			if (retryAfterHeader && res.status == 429) setTimeout(async () => resolve(await getPlayerActiveShard(cache, rateLimits, region, game, puuid, riotToken)), parseInt(retryAfterHeader) * 1000);
			else res.json().then(json => {
				if (res.status.toString()[0] == "2") {
					if (Array.isArray(json) || typeof json !== "object") reject({ reason: "Bad response type", value: json });
					else if (!json.players) reject({ reason: "Missing properties", value: json });
					else {
						const platformData: ActiveShard = { activeShard: json.activeShard, game: json.game, puuid: json.puuid };

						cache.playerActiveShard[region][game][puuid] = { ...platformData, lastUpdate: Date.now() };
						
						resolve(platformData);
					}
				} else reject(json);
			}, () => res.text().then(text => (res.status.toString()[0] == "2" ? resolve : reject)(text)))
		}, reason => reject(reason))
	})
}

// Classes

export default class Riopi {
	/**
	 * @param riotToken See https://developer.riotgames.com/
	 */
	constructor(riotToken: string, defaultRegion: Region) {
		this.riotToken = riotToken
		this.defaultRegion = defaultRegion

		this.rateLimits = {
			AMERICAS: {
				app: [{ count: 0, max: Infinity, timeout: null }, { count: 0, max: Infinity, timeout: null }],
				getAccountByAccessToken: { count: 0, max: Infinity, timeout: null },
				getAccountByPuuid: { count: 0, max: Infinity, timeout: null },
				getAccountByRiotId: { count: 0, max: Infinity, timeout: null },
				getPlayerActiveShard: { count: 0, max: Infinity, timeout: null }
			},
			ASIA: {
				app: [{ count: 0, max: Infinity, timeout: null }, { count: 0, max: Infinity, timeout: null }],
				getAccountByAccessToken: { count: 0, max: Infinity, timeout: null },
				getAccountByPuuid: { count: 0, max: Infinity, timeout: null },
				getAccountByRiotId: { count: 0, max: Infinity, timeout: null },
				getPlayerActiveShard: { count: 0, max: Infinity, timeout: null }
			},
			ESPORTS: {
				app: [{ count: 0, max: Infinity, timeout: null }, { count: 0, max: Infinity, timeout: null }],
				getAccountByAccessToken: { count: 0, max: Infinity, timeout: null },
				getAccountByPuuid: { count: 0, max: Infinity, timeout: null },
				getAccountByRiotId: { count: 0, max: Infinity, timeout: null },
				getPlayerActiveShard: { count: 0, max: Infinity, timeout: null }
			},
			EUROPE: {
				app: [{ count: 0, max: Infinity, timeout: null }, { count: 0, max: Infinity, timeout: null }],
				getAccountByAccessToken: { count: 0, max: Infinity, timeout: null },
				getAccountByPuuid: { count: 0, max: Infinity, timeout: null },
				getAccountByRiotId: { count: 0, max: Infinity, timeout: null },
				getPlayerActiveShard: { count: 0, max: Infinity, timeout: null }
			}
		}

		this.cache = {
			accountByAccessToken: { AMERICAS: {}, ASIA: {}, ESPORTS: {}, EUROPE: {} },
			accountByPuuid: { AMERICAS: {}, ASIA: {}, ESPORTS: {}, EUROPE: {} },
			accountByRiotId: { AMERICAS: {}, ASIA: {}, ESPORTS: {}, EUROPE: {} },
			playerActiveShard: { AMERICAS: { lor: {}, val: {} }, ASIA: { lor: {}, val: {} }, ESPORTS: { lor: {}, val: {} }, EUROPE: { lor: {}, val: {} } }
		}
	}

	private readonly riotToken: string;
	private readonly defaultRegion: Region;
	private readonly rateLimits: RateLimits
	private readonly cache: Cache;

	/**
	 * Get account by puuid
	 */
	getAccountByPuuid(puuid: Puuid, region?: Region) { return getAccountByPuuid(this.cache, this.rateLimits, region || this.defaultRegion, puuid, this.riotToken) };

	/**
	 * Get account by riot id
	 */
	getAccountByRiotId(gameName: string, tagLine: string, region?: Region) { return getAccountByRiotId(this.cache, this.rateLimits, region || this.defaultRegion, gameName, tagLine, this.riotToken) };

	/**
	 * Get account by access token
	 */
	getAccountByAccessToken(authorization: string, region?: Region) { return getAccountByAccessToken(this.cache, this.rateLimits, region || this.defaultRegion, authorization, this.riotToken) };

	/**
	 * Get active shard for a player
	 */
	getPlayerActiveShard(game: Games, puuid: Puuid, region?: Region) { return getPlayerActiveShard(this.cache, this.rateLimits, region || this.defaultRegion, game, puuid, this.riotToken) };
};

// Types

type FunctionName = "getAccountByPuuid" | "getAccountByRiotId" | "getAccountByAccessToken" | "getPlayerActiveShard";

type RateLimits = Record<Region, Record<"app", [RateLimit, RateLimit]> & Record<FunctionName, RateLimit>>;

export type Region = "AMERICAS" | "EUROPE" | "ASIA" | "ESPORTS";

export type Puuid = string;

export type MatchIds = string[];

// Interfaces

export interface Account {
	puuid: string;
	/**
	 * This field may be excluded from the response if the account doesn't have a gameName.
	 */
	gameName?: string;
	/**
	 * This field may be excluded from the response if the account doesn't have a tagLine.
	 */
	tagLine?: string;
};

export interface ActiveShard {
	puuid: Puuid;
	game: Games;
	activeShard: string;
};

interface Cache {
	accountByPuuid: Record<Region, Record<string, Account & { lastUpdate: number }>>;
	accountByRiotId: Record<Region, Record<string, Account & { lastUpdate: number }>>;
	accountByAccessToken: Record<Region, Record<string, Account & { lastUpdate: number }>>;
	playerActiveShard: Record<Region, Record<Games, Record<Puuid, ActiveShard & { lastUpdate: number }>>>;
};

interface RateLimit {
	count: number;
	max: number;
	timeout: NodeJS.Timeout | null;
};

// Enums

export enum Games {
	Valorant = "val",
	"League of Runeterra" = "lor"
};