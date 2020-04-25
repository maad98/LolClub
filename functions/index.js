const functions = require('firebase-functions');

const { Kayn, REGIONS } = require('kayn');
const apiKey = 'RGAPI-7f543a24-6fff-4c26-bbe3-fbac20d3cb95';

const kayn = Kayn(apiKey)({
    region: REGIONS.NORTH_AMERICA,
    apiURLPrefix: 'https://%s.api.riotgames.com',
    locale: 'en_US',
    debugOptions: {
        isEnabled: true,
        showKey: false,
    },
    requestOptions: {
        shouldRetry: true,
        numberOfRetriesBeforeAbort: 3,
        delayBeforeRetry: 1000,
        burst: false,
        shouldExitOn403: false,
    },
    cacheOptions: {
        cache: null,
        timeToLives: {
            useDefault: false,
            byGroup: {},
            byMethod: {},
        },
    },
})

///var givenServer = request.query.server;
exports.getHistory = functions.https.onRequest(async(request, response) => {
        let givenSummName = request.query.name;
        givenSummName =encodeURI(givenSummName);
        const { accountId } = await kayn.Summoner.by.name(givenSummName)
        const { matches } = await kayn.Matchlist.by
            .accountID(accountId)
            .query({ queue: 420 })
        const gameIds = matches.slice(0, 10).map(({ gameId }) => gameId)
        const requests = gameIds.map(kayn.Match.get)
        const results = await Promise.all(requests)
        let wantedData = [];
        results.forEach(result=> {
            
            for(i = 0; i < 10; i++)
            {
                if(result.participantIdentities[i].player.summonerName === givenSummName)
                {
                    if(result.participants[i].participantId > 5)
                    {
                        wantedData.push(result.teams[1].win);
                    }
                    else
                    {
                        wantedData.push(result.teams[0].win);
                    }
                    wantedData.push(result.gameCreation);
                    wantedData.push(result.gameDuration);
                    wantedData.push(result.participantIdentities[i].player.summonerName);
                    wantedData.push(result.participants[i].spell1Id);
                    wantedData.push(result.participants[i].spell2Id);
                    wantedData.push(result.participants[i].stats.kills);
                    wantedData.push(result.participants[i].stats.deaths);
                    wantedData.push(result.participants[i].stats.assists);
                    wantedData.push(result.participants[i].championId);
                    wantedData.push('--------------------------------------------------------');
                    break;
                }
            }
       })
        console.log(givenSummName)
        response.send(wantedData);
        

    });
    
