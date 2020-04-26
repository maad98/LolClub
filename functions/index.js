const functions = require('firebase-functions');

const { Kayn, REGIONS } = require('kayn');
const apiKey = 'RGAPI-34175a01-cc9c-47ff-ba91-c0367b62c7e0';

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
        burst: true,
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
        let givenSummName = request.query.name || 'Eyta';
        let givenServer=request.query.server || 'na1';
        const { accountId } = await kayn.Summoner.by.name(givenSummName)
        const { matches } = await kayn.Matchlist.by
            .accountID(accountId)
            .query({ queue: [420, 440]  })
        const gameIds = matches.slice(0, 10).map(({ gameId }) => gameId)
        const requests = gameIds.map(kayn.Match.get)
        const results = await Promise.all(requests)
        var wantedData = [];
        try{
        results.forEach(result=> {
            for(i = 0; i < 10; i++)
            {
                if(result.participantIdentities[i].player.summonerName === givenSummName.toString())
                {
                    let totalMinions = result.participants[i].stats.totalMinionsKilled +
                    result.participants[i].stats.neutralMinionsKilled;
                   
                    let matchWantedData={
                        name : result.participantIdentities[i].player.summonerName,
                        win : (result.participants[i].participantId > 5) ? result.teams[1].win : result.teams[0].win,
                        date : result.gameCreation,
                        queue : result.queueId || 'none',
                        duration: result.gameDuration,
                        champion: result.participants[i].championId,
                        spell1 : result.participants[i].spell1Id,
                        spell2 : result.participants[i].spell2Id,
                        kills : result.participants[i].stats.kills,
                        deaths : result.participants[i].stats.deaths,
                        assists : result.participants[i].stats.assists,
                        minions: totalMinions,
                        vision: result.participants[i].stats.visionScore,
                        //KP
                    };
                    wantedData.push(matchWantedData);
                    break;
                }
            }
            
       })
    }catch(e){console.log(e)}
        response.send(wantedData);
       
    });
    
   