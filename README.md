# Riopi

- Riopi isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
- Riopi was created under Riot Games' "Legal Jibber Jabber" policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this project.

## About

Riopi is a [Node.js](https://nodejs.org/en) module for interacting with [Riot Game API](https://developer.riotgames.com) (not the games). The module handles rate limits and includes a caching system.

## Example usage

Install riopi :

```sh
npm install riopi
```

Get account by access token :

```ts
import Riopi from "riopi";

const riopi = new Riopi("Your RIOT_TOKEN", "EUROPE");

riopi.getAccountByAccessToken("ACCESS_TOKEN").then(account => {
  if (typeof account == "string") console.log(`Account: ${account}`);
  else {
    console.log(`Puuid: ${account.puuid}`);
    console.log(`Pseudo: ${account.gameName && account.tagLine ? `${account.gameName}#${account.tagLine}` : "Anonymous"}`);
  }
});
```

Get account by puuid :

```ts
import Riopi from "riopi";

const riopi = new Riopi("Your RIOT_TOKEN", "EUROPE");

riopi.getAccountByPuuid("PUUID").then(account => {
  if (typeof account == "string") console.log(`Account: ${account}`);
  else {
    console.log(`Puuid: ${account.puuid}`);
    console.log(`Pseudo: ${account.gameName && account.tagLine ? `${account.gameName}#${account.tagLine}` : "Anonymous"}`);
  }
});
```

Get account by riot id :

```ts
import Riopi from "riopi";

const riopi = new Riopi("Your RIOT_TOKEN", "EUROPE");

riopi.getAccountByRiotId("GAME_NAME", "TAG_LINE").then(account => {
  if (typeof account == "string") console.log(`Account: ${account}`);
  else {
    console.log(`Puuid: ${account.puuid}`);
    console.log(`Pseudo: ${account.gameName && account.tagLine ? `${account.gameName}#${account.tagLine}` : "Anonymous"}`);
  }
});
```

Get active shard for a player :

```ts
import Riopi from "riopi";

const riopi = new Riopi("Your RIOT_TOKEN", "EUROPE");

riopi.getPlayerActiveShard(Games.Valorant, "PUUID").then(player => {
  if (typeof player == "string") console.log(`Response: ${player}`);
  else console.log(`Active shard: ${player.activeShard}`);
});
```