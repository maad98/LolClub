const functions = require('firebase-functions');

const { Kayn, REGIONS } = require('kayn');
const apiKey = 'RGAPI-c0810f8f-9ad1-4545-bc6c-2e78cccd40c0';

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
        let givenSummName = request.query.name || 'Eyta';
        let givenServer=request.query.server || 'na';
        givenSummName =encodeURI(givenSummName);
        const { accountId } = await kayn.Summoner.by.name(givenSummName)
        const { matches } = await kayn.Matchlist.by
            .accountID(accountId)
            .query({ queue: 420  })
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
                    let matchWantedData={
                        name : result.participantIdentities[i].player.summonerName,
                        win : (result.participants[i].participantId > 5) ? result.teams[1].win : result.teams[0].win,
                        data : result.gameCreation,
                        duration: result.gameDuration,
                        champion: result.participants[i].championId,
                        spell1 : result.participants[i].spell1Id,
                        spell2 : result.participants[i].spell2Id,
                        kills : result.participants[i].stats.kills,
                        deaths : result.participants[i].stats.deaths,
                        assists : result.participants[i].stats.assists,
                    };
                    wantedData.push(matchWantedData);
                    break;
                }
            }
            
       })
    }catch(e){console.log(e)}
        response.send(wantedData);
    });
    



    // if(result.participants[i].participantId > 5)
    // {
    //     //wantedData[cntr][0]=result.teams[1].win;
    // }
    // else
    // {
    //     //wantedData[cntr][0]=result.teams[0].win;
    // }

    //   wantedData[cntr][0].push(result.gameCreation);
    //   wantedData[cntr][1].push(result.gameDuration);
    //   wantedData[cntr][2].push(result.participantIdentities[i].player.summonerName);
    //   wantedData[cntr][3].push(result.participants[i].spell1Id);
    //   wantedData[cntr][4].push(result.participants[i].spell2Id);
    //   wantedData[cntr][5].push(result.participants[i].stats.kills);
    //   wantedData[cntr][6].push(result.participants[i].stats.deaths);
    //   wantedData[cntr][7].push(result.participants[i].stats.assists);
    //   wantedData[cntr][8].push(result.participants[i].championId);
    //   wantedData[cntr][9].push('--------------------------------------------------------');




    // wantedData[cntr][0]= (result.participants[i].participantId > 5) ? wantedData[cntr][0]=result.teams[1].win : wantedData[cntr][0]=result.teams[0].win;
    //                 wantedData[cntr][1]=result.gameCreation;
    //                 wantedData[cntr][2]=result.gameDuration;
    //                 wantedData[cntr][3]=result.participantIdentities[i].player.summonerName;
    //                 wantedData[cntr][4]=result.participants[i].spell1Id;
    //                 wantedData[cntr][5]=result.participants[i].spell2Id;
    //                 wantedData[cntr][6]=result.participants[i].stats.kills;
    //                 wantedData[cntr][7]=result.participants[i].stats.deaths;
    //                 wantedData[cntr][8]=result.participants[i].stats.assists;
    //                 wantedData[cntr][9]=result.participants[i].championId;
    //                 console.log('cntr is '+cntr+'   '+wantedData[cntr]);
    //                 break;