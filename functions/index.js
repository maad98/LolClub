const functions = require('firebase-functions');

var admin = require("firebase-admin");

var serviceAccount = require("./lolclub-firebase-adminsdk-px2rx-e43ef1eb4a.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://lolclub.firebaseio.com"
});

const { Kayn, REGIONS } = require('kayn');
const apiKey = 'RGAPI-06b726dc-b966-43f7-bbd8-937247f2da16';

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

function getKp(result, flag){
    // var index = (bool == true) ? 5 : 0;
    let sum = 0;
    if(flag){
        for(i = 5; i < 10; i++){
          sum += result.participants[i].stats.kills;
        }
      }
      else{
        for(i = 0; i < 5; i++){
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
    let givenSummName = request.query.name || 'LastWarriorX';
    let givenServer=request.query.server || 'euw';
    let givenCode=request.query.code || '1234';
    let id=makeid(10);
    try{
        let isVerified=await checkCode(givenSummName,givenServer,givenCode);
        if(!isVerified) //the provided code by the user is wrong
        {
            let responseBody={
                status:404,
                message : 'Unsuccessful : Wrong Code',
            };
            response.send(responseBody);
        }
        else{
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
            let responseBody={
                status:200,
                message : 'Successful : User Created',
                id : id,
            };
            response.send(responseBody);
        }
    }
    catch(e){
        console.log(e);
        response.send(e);
    }
    
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

async function  checkCode (givenSummName,givenServer,givenCode){
    
    const { id: myID } = await kayn.Summoner.by.name(givenSummName).region(givenServer)

    const code = await kayn.ThirdPartyCode.by.summonerID(myID).region(givenServer)
    
    console.log("the code is "+code);

    console.log(code);

    return code===givenCode;
}


exports.updateProfile=functions.https.onRequest(async(request, response) => {
    let givenID = request.query.id;
    let givenImageUrl=request.query.url;
    let givenMainLane=request.query.main;
    let givenSecondaryLane=request.query.secondary;
    let givenGender=request.query.gender;
    console.log('the id is : '+givenID);
    try{
    var flexBox=null;
    var soloBox=null;

    var userData=await getIGNandServerByID(givenID);
    console.log(await userData);

    var rankData=await getRank(userData.ign,userData.server);
    console.log('rank data = ' + rankData);

    rankData.forEach(rank =>{
        if(rank.queue==='soloq')
            soloBox=rank;
        else
            flexBox=rank;
    });
    var db = admin.database();
    var ref = db.ref('/users/'+givenID);
    ref.once('value').then(snapshot => {
        if(snapshot.exists()){
            ref.update({
                'info/imageurl': givenImageUrl,
                'info/mainlane': givenMainLane,
                'info/secondarylane': givenSecondaryLane,
                'info/gender': givenGender,
                'info/solorank': soloBox !== null ? soloBox :'unranked' ,
                'info/flexrank': flexBox !== null ? flexBox :'unranked'
            });
            let responseBody={
                status:200,
                message : 'Successful : all went well',
            };
            response.send(responseBody);
        }
        else{
            let responseBody={
                status:404,
                message : 'Unsuccessful : ID doesnt exist',
            };
            response.send(responseBody);
        }
        return null;
    }).catch(()=>{
        let responseBody={
            status:404,
            message : 'Unsuccessful',
        };
        response.send(responseBody);
    });
    }
    catch(e){
        console.log(e);
        let responseBody={
            status:404,
            message : 'Unsuccessful',
        };
        response.send(responseBody);
    }
});

async function getRank(givenSummName,givenServer){
    try{
        const { id: myID } = await kayn.Summoner.by.name(givenSummName).region(givenServer);
        let ranksJSON=await kayn.League.Entries.by.summonerID(myID);
        var returnBody=[];
        ranksJSON.forEach(rank=>{
            if(rank.queueType==='RANKED_SOLO_5x5'){
                let rankBox={
                    queue : 'soloq',
                    tier : rank.tier,
                    rank : rank.rank,
                    lp : rank.leaguePoints,
                    wr : Math.round(rank.wins/(rank.wins+rank.losses)*100),
                };
                returnBody.push(rankBox);
            }
            else {
                let rankBox={
                    queue : 'flexq',
                    tier : rank.tier,
                    rank : rank.rank,
                    lp : rank.leaguePoints,
                    wr : Math.round(rank.wins/(rank.wins+rank.losses)*100),
                };
                returnBody.push(rankBox);
            }
        })
        return returnBody;
    }catch(e){
        console.log(e);
        return ('error');
    }
 }

exports.testing=functions.https.onRequest(async(request, response) => {
    try{
        let userData=await getIGNandServerByID('knBVNytag1');
        console.log(userData.ign+" / "+userData.server);

        let userRank=await getRank('7 Dead Lee Sins','euw');
        console.log(userRank);

        response.send(userRank);
    }
    catch(e){
        response.send(e);
    }
});

async function getIGNandServerByID(id){
    var db = admin.database();
    var ref = db.ref("/users/"+id+"/info/");
    return new Promise((resolve, reject) => {
        ref.on('value', snapshot => resolve({
            ign : snapshot.val().ign,
            server : snapshot.val().server,
        }), reject)
    })
}

