const functions = require('firebase-functions');

const { Kayn, REGIONS } = require('kayn');
const apiKey = 'RGAPI-9197a94a-5a17-422a-aafb-1dba9bd50b72';

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


exports.getHistory = functions.https.onRequest(async(request, response) => {
        const { accountId } = await kayn.Summoner.by.name('Eyta')
        const { matches } = await kayn.Matchlist.by
            .accountID(accountId)
            .query({ queue: 420 })
        const gameIds = matches.slice(0, 10).map(({ gameId }) => gameId)
        const requests = gameIds.map(kayn.Match.get)
        const results = await Promise.all(requests)
        var wantedData = [];
        results.forEach(result=> {
            wantedData.push(result.teams.win);
            for(i = 0; i < 10; i++)
            {
                let particId = result.participantIdentities[i].participantId;
                wantedData.push(particId);
                wantedData.push(result.participantIdentities.player.summonerName);
                
                wantedData.push(result.participants.spell1Id);
                wantedData.push(result.participants.spell2Id);
                wantedData.push(result.participants.kills);
                wantedData.push(result.participants.deaths);
                wantedData.push(result.participants.assists);
                wantedData.push(result.participants.championId);
                wantedData.push('----------------Maad & Yusuf & Ayham Kaka--------------------');
            }
           
       })
        console.log(results)
        response.send(results);
        

    });
    
