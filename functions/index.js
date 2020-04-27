const functions = require('firebase-functions');

var admin = require("firebase-admin");

var serviceAccount = require("./lolclub-firebase-adminsdk-px2rx-e43ef1eb4a.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://lolclub.firebaseio.com"
});

const { Kayn, REGIONS } = require('kayn');
const apiKey = 'RGAPI-65486bbd-eb04-480c-a61b-c513fc84c9ce';

let kayn = Kayn(apiKey)({
    region: REGIONS.EUROPE_WEST,
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
        let givenSummName = request.query.name || 'Last WarriorX';
        let givenServer=request.query.server || 'euw';
        let givenRegion=getRegion(givenServer);
        console.log(givenRegion);
        try{   
        const { accountId } = await kayn.Summoner.by.name(givenSummName)
        .region(givenServer)
        const { matches } = await kayn.Matchlist.by
            .accountID(accountId)
            .region(givenServer)
            .query({ queue: [420, 440]  }) 
        const gameIds = matches.slice(0, 10).map(({ gameId }) => gameId)
        const requests = gameIds.map(kayn.Match.get).map(x => x.region(givenRegion));
        const results = await Promise.all(requests)
        var wantedData = [];
        results.forEach(result=> {
            for(i = 0; i < 10; i++)
            {
                if(result.participantIdentities[i].player.summonerName === givenSummName.toString())
                {
                    let totalMinions = result.participants[i].stats.totalMinionsKilled +
                    result.participants[i].stats.neutralMinionsKilled;

                    let ka = result.participants[i].stats.kills +result.participants[i].stats.assists

                    let matchWantedData={
                        name : result.participantIdentities[i].player.summonerName,
                        win : (result.participants[i].participantId > 5) ? result.teams[1].win : result.teams[0].win,
                        date : result.gameCreation,
                        queue : result.queueId ,
                        duration: result.gameDuration,
                        champion: result.participants[i].championId,
                        spell1 : result.participants[i].spell1Id,
                        spell2 : result.participants[i].spell2Id,
                        kills : result.participants[i].stats.kills,
                        deaths : result.participants[i].stats.deaths,
                        assists : result.participants[i].stats.assists,
                        minions: totalMinions,
                        vision: result.participants[i].stats.visionScore,
                        kp: (result.participants[i].participantId > 5) ? Math.round(ka/getKp(result, true) * 100) : Math.round(ka/getKp(result, false)* 100)
                    };
                    wantedData.push(matchWantedData);
                    break;
                }
            }
            
       })
    }catch(e){
        console.log(e);
    }
        response.send(wantedData);
       
    });

    function getKp(result, bool)
    {
     // var index = (bool == true) ? 5 : 0;
      let sum = 0;

      if(bool == true)
      {
        for(i = 5; i < 10; i++)
        {
          
          sum += result.participants[i].stats.kills;
  
        }
      }
      else
      {
        for(i = 0; i < 5; i++)
        {
          
          sum += result.participants[i].stats.kills;
  
        }
      }
      
      return sum;

    }
    
 function getRegion(givenServer){
    switch(givenServer) {
        case 'euw':
            return REGIONS.EUROPE_WEST;
        case 'na':
            return REGIONS.NORTH_AMERICA;
        case 'eune':
            return REGIONS.EUROPE;
        case 'oce':
            return REGIONS.OCEANIA;
        case 'br':
            return REGIONS.BRAZIL;
        case 'las':
            return REGIONS.LATIN_AMERICA_SOUTH;
        case 'tur':
            return REGIONS.TURKEY;
        case 'lan':
            return REGIONS.LATIN_AMERICA_NORTH;        
        case 'ru' :
            return REGIONS.RUSSIA;         
        case 'jp' :
            return REGIONS.JAPAN;         
        case 'kr':
            return REGIONS.KOREA; 
        default: 
            return REGIONS.NORTH_AMERICA;
      }
}

exports.confirmIGNAndCreateUserDocument = functions.https.onRequest(async(request, response) => {
    let givenSummName = request.query.name ;
    let givenServer=request.query.server;
    let givenCode=request.query.code ;
    var id=makeid(10);
    try{
        var db = admin.database();
        var ref = db.ref("/users/"+id);
        ref.set({
            info : {
            ign :givenSummName,
            server :givenServer,
            email: 'none',
            gender:'none',
            mainlane:'none',
            secondarylane:'none',
            imageurl:'none',
            isVerified:true,
            isEmailVerified:false,
            datecreated: Date.now(),
            solorank:'none',
            flexrank:'none',
            friends:'none',
            clashteams:'none',
           }
        });
    }
    catch(e){
        console.log(e);
    }
    let responseBody={
        status:200,
        id : id,
    };
    response.send(responseBody);
});

function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }
