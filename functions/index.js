const functions = require('firebase-functions');

var admin = require("firebase-admin");

var serviceAccount = require("./lolclub-firebase-adminsdk-px2rx-e43ef1eb4a.json");

const { Kayn, REGIONS } = require('kayn');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://lolclub.firebaseio.com"
});

const apiKey = 'RGAPI-e1795503-4162-4834-91a1-1bf132761645';

const kNoRanks='no_ranks';

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

exports.confirmIGNAndCreateUserDocument = functions.https.onRequest(async(request, response) => {
        let givenSummName = request.query.name || '7 Dead Lee Sins';
        let givenServer=request.query.server || 'euw';
        let givenCode=request.query.code || '1234';
        let id=makeid(10);
        try{
            //let isVerified=await checkCode(givenSummName,givenServer,givenCode);
            let isVerified= true;
            if(!isVerified) //the provided code by the user is wrong
            {
                let responseBody={
                    status:404,
                    message : 'Unsuccessful : Wrong Code',
                };
                response.send(responseBody);
            }
            else{
                var flexBox='unranked';
                var soloBox='unranked';
                let ranksInfo=await getRankingInfoFromAPI(givenSummName,givenServer);
                var matches='no matches';
                if(!isEmpty(ranksInfo)){
                    ranksInfo.forEach(rank =>{
                        if(rank.queue==='soloq')
                            soloBox=rank;
                        else
                            flexBox=rank;
                    });
                    matches=await getLast10MatchHistoryData(givenSummName,givenServer);
                }
                var db = admin.database();
                var ref = db.ref("/users/"+givenServer+"/"+id);
                var dateCreated=getGameDate(Date.now());
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
                        dateCreated: dateCreated,
                        solorank: soloBox,
                        flexrank: flexBox,
                    },
                    matchList : matches,
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

exports.updateProfile=functions.https.onRequest(async(request, response) => {
    let givenID = request.query.id;
    let givenServer=request.query.server;
    let givenImageUrl=request.query.url;
    let givenMainLane=request.query.main;
    let givenSecondaryLane=request.query.secondary;
    let givenGender=request.query.gender;
 
    try{
        var db = admin.database();
        
        var ref = db.ref("/users/"+givenServer+"/"+givenID);
        
        ref.once('value').then(snapshot => {

            if(snapshot.exists()){
                ref.update({
                    'info/imageurl': givenImageUrl,
                    'info/mainlane': givenMainLane,
                    'info/secondarylane': givenSecondaryLane,
                    'info/gender': givenGender,
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

exports.getHistory = functions.https.onRequest(async(request, response) => {
    let givenID=request.query.id;
    let givenServer=request.query.server ;
    try{
        let userData =await getUserInfoByID(givenID,givenServer);
        let userRank=[];
        userRank.push(userData.flexrank);
        userRank.push(userData.solorank);
        var wantedData = [];
        let userInfo={
                ign : userData.ign,
                mainLane : userData.mainLane,
                secondaryLane : userData.secondaryLane,
                gender : userData.gender,
                imageurl : userData.imageurl,
                rank : userRank,
        };
        wantedData.push(userInfo);
        var matchesList = await getUserMatchListByID(givenID,givenServer);
        //var matchesList=await getLast10MatchHistoryData(givenSummName,givenServer);
        wantedData.push(matchesList);
        response.send(wantedData); 
    }catch(e){
        let responseBody={
            status:404,
            message : 'Unsuccessful',
        };
        console.log(e);
        response.send(e);
    }
});

exports.get10SwipesById=functions.https.onRequest(async(request, response) => {
    let givenID=request.query.id;
    let givenServer=request.query.server;
    try{
        //TODO : pass the id to get swipes to wanted level .
        var _10Swipes=await get10IdsData(givenID,givenServer);
        response.send(_10Swipes);
    }
    catch(e){
        console.log();
        response.send('error');
    }
});

exports.testing=functions.https.onRequest(async(request, response) => {
    try{
        //Last WarriorX       7 Dead Lee Sins     illumi zoldyck1 
        await updateUserRankingInfoAndMatchHistory('50n4HqZiFU','euw','illumi zoldyck1');
        response.send('test');
    }
    catch(e){
        response.send('error '+e );
    }
});

// Util Function to check if a given Object is empty or not
function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}


async function updateUserRankingInfoAndMatchHistory(givenID,givenServer,givenSummName){

    await updateProfileMatchHistoryViaID(givenID,givenServer);

    let newRankData=await getRankingInfoFromAPI(givenSummName,givenServer);
    var flexBox='unranked';
    var soloBox='unranked'; 
    if(!isEmpty(newRankData)){
        newRankData.forEach(rank =>{
            if(rank.queue==='soloq')
                soloBox=rank;
            else
                flexBox=rank;
        });
    }
    var db = admin.database();
    var ref = db.ref("/users/"+givenServer+"/"+givenID+"/info");
    ref.update({
            solorank: soloBox,
            flexrank: flexBox,
    });
}

async function updateProfileMatchHistoryViaID(givenID,givenServer){
    let userData =await getUserInfoByID(givenID,givenServer);
    let givenSummName=userData.ign;
    console.log('Updating User : '+givenSummName+' Profile . SERVER : '+givenServer);
    var matchesList=await getLast10MatchHistoryData(givenSummName,givenServer);
    var db = admin.database();
    var ref = db.ref("/users/"+givenServer+"/"+givenID);
    ref.update({
        "matchList" : matchesList,
    });
}

async function getRankingInfoFromAPI(givenSummName,givenServer){
    //TODO : to be changed to come from db
    try{
        const { id: myID } = await kayn.Summoner.by.name(givenSummName).region(givenServer);
        let ranksJSON=await kayn.League.Entries.by.summonerID(myID);
        var returnBody=[];
        ranksJSON.forEach(rank=>{
            console.log(rank.queueType);
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

async function getLast10MatchHistoryData(givenSummName,givenServer){
    var championList;
    championList =await kayn.DDragon.Champion.listDataByIdWithParentAsId();
    championList=championList.data;
    console.log(givenSummName+ " / "+ givenServer);
    let givenRegion=getRegion(givenServer);
    const { accountId } = await kayn.Summoner.by.name(givenSummName)
        .region(givenServer)
    const { matches } = await kayn.Matchlist.by
        .accountID(accountId)
        .region(givenServer)
        .query({ queue: [420, 440]  }) 
    const gameIds = matches.slice(0, 10).map(({ gameId }) => gameId)
    const requests = gameIds.map(kayn.Match.get).map(x => x.region(givenRegion));
    const results = await Promise.all(requests)
    return new Promise((resolve, reject) => {
        var matchesList=[];
        results.forEach(result=> {
                for(i = 0; i < 10; i++)
                {
                    if(result.participantIdentities[i].player.summonerName === givenSummName.toString())
                    {
                        let totalMinions = result.participants[i].stats.totalMinionsKilled +
                        result.participants[i].stats.neutralMinionsKilled;
                        let ka = result.participants[i].stats.kills +result.participants[i].stats.assists;
                        let championId=result.participants[i].championId.toString();
                        let championName=championList[championId].name;
                        let duration =getGameDuration(result.gameDuration);
                        let gameDate=getGameDate(result.gameCreation);
                        let matchWantedData={
                            win : (result.participants[i].participantId > 5) ? result.teams[1].win : result.teams[0].win,
                            date : gameDate,
                            queue : result.queueId ,
                            duration: duration,
                            champion: championName,
                            spell1 : result.participants[i].spell1Id,
                            spell2 : result.participants[i].spell2Id,
                            kills : result.participants[i].stats.kills,
                            deaths : result.participants[i].stats.deaths,
                            assists : result.participants[i].stats.assists,
                            minions: totalMinions,
                            vision: result.participants[i].stats.visionScore,
                            kp: (result.participants[i].participantId > 5) ? Math.round(ka/getKp(result, true) * 100) : Math.round(ka/getKp(result, false)* 100)
                        };
                        matchesList.push(matchWantedData);
                        break;
                    }
                }
        })
        resolve(matchesList);
    });
}

async function get10IdsData(givenID,givenServer){
    var userIDS=[];
    var db = admin.database();
    var ref = db.ref("/users/"+givenServer);
    let userData =await getUserInfoByID(givenID,givenServer);
    let givenSummName=userData.ign;
    console.log(givenSummName);
    return new Promise((resolve, reject) => {
        ref.once(
          'value',
          function (snapshot) {
            snapshot.forEach(data => {
            let userRank=[];
            userRank.push(data.child('info').child('solorank').val());
            userRank.push(data.child('info').child('flexrank').val());
            let usersdata={
                id : data.key,
                ign : data.child('info').child('ign').val(),
                url : data.child('info').child('imageurl').val(),
                mainLane :data.child('info').child('mainlane').val(),
                gender : data.child('info').child('gender').val(),
                secondaryLane :data.child('info').child('secondarylane').val(),
                tier :data.child('info').child('solorank').child('tier').val()!== null ?data.child('info').child('solorank').child('tier').val() : 'unranked',
                rank : data.child('info').child('solorank').child('rank').val(),
                wr : data.child('info').child('solorank').child('wr').val()!== null ? data.child('info').child('solorank').child('wr').val() : -1 ,
                rankingInfo : userRank,//TODO : get user Rank from db not lol api later
                matchList: data.child('matchList').val(),
              };
              userIDS.push(usersdata);
            })
            resolve(userIDS)
          },
          function (errorObject) {
            console.log('The read failed: ' + errorObject.code)
            reject(errorObject)
          }
        )
      });
}

function getGameDuration(time){
    var date=new Date(time * 1e3);
    return(date.getMinutes()+':'+((date.getSeconds() < 10)? '0' +date.getSeconds(): date.getSeconds()));
}

function getGameDate(timestamp){
    var d=new Date(timestamp);
    return((d.getMonth()+1) +'/' + +d.getDate() +'/' + d.getFullYear());
}

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

function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

async function checkCode (givenSummName,givenServer,givenCode){
    
    const { id: myID } = await kayn.Summoner.by.name(givenSummName).region(givenServer)

    const code = await kayn.ThirdPartyCode.by.summonerID(myID).region(givenServer)
    
    console.log("the code is "+code);

    console.log(code);

    return code===givenCode;
}


async function getUserInfoByID(id,givenServer){
    var db = admin.database();
    var ref = db.ref("/users/"+givenServer+"/"+id+"/info");
    return new Promise((resolve, reject) => {
        ref.on('value', snapshot => resolve({
            ign : snapshot.val().ign,
            server : snapshot.val().server,
            mainLane : snapshot.val().mainlane,
            secondaryLane : snapshot.val().secondarylane,
            gender : snapshot.val().gender,
            imageurl : snapshot.val().imageurl,
            flexrank : snapshot.val().flexrank,
            solorank : snapshot.val().solorank,
        }), reject)
    })
}

async function getUserMatchListByID(id,givenServer){
    var db = admin.database();
    var ref = db.ref("/users/"+givenServer+"/"+id+"/matchList");
    return new Promise((resolve, reject) => {
        ref.on('value', snapshot => resolve(
            snapshot.val()
        ), reject)
    })
}
