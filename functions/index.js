const functions = require('firebase-functions');

var admin = require("firebase-admin");

var serviceAccount = require("./lolclub-firebase-adminsdk-px2rx-e43ef1eb4a.json");

const { Kayn, REGIONS } = require('kayn');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://lolclub.firebaseio.com"
});

const apiKey = 'RGAPI-28251490-2aaa-4fa1-aaea-72aea6da4b88';

const FRIEND_REQUEST_METHOD = 'FRIEND_REQUEST';


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

exports.confirmIGNAndCreateUserDocument = functions.https.onRequest(async (request, response) => {
    let givenSummName = request.query.name || 'Sir Crownguard';
    let givenServer = request.query.server || 'euw';
    let givenCode = request.query.code || '1234';
    let id = await getPUUID(givenSummName, givenServer);

    try {
        //let isVerified=await checkCode(givenSummName,givenServer,givenCode);
        let isVerified = true;
        if (!isVerified) //the provided code by the user is wrong
        {
            let responseBody = {
                status: 404,
                message: 'Unsuccessful : Wrong Code',
            };
            response.send(responseBody);
        }
        else {
            var flexBox = 'unranked';
            var soloBox = 'unranked';
            let ranksInfo = await getRankingInfoFromAPI(givenSummName, givenServer);
            var matches = 'no matches';
            if (!isEmpty(ranksInfo)) {
                ranksInfo.forEach(rank => {
                    if (rank.queue === 'soloq')
                        soloBox = rank;
                    else
                        flexBox = rank;
                });
                matches = await getLast10MatchHistoryData(givenSummName, givenServer);
            }
            var db = admin.database();
            var ref = db.ref("/users/" + givenServer + "/" + id);
            var dateCreated = getTimestampDate(Date.now());
            ref.set({
                info: {
                    ign: givenSummName,
                    server: givenServer,
                    email: 'none',
                    gender: 'none',
                    mainlane: 'none',
                    secondarylane: 'none',
                    imageurl: 'none',
                    isVerified: true,
                    isEmailVerified: false,
                    dateCreated: dateCreated,
                    solorank: soloBox,
                    flexrank: flexBox,
                },
                matchList: matches,
            });

            let responseBody = {
                status: 200,
                message: 'Successful : User Created',
                id: id,
            };
            response.send(responseBody);
        }
    }
    catch (e) {
        console.log(e);
        response.send(e);
    }
});

exports.signMoreDeviceInfo = functions.https.onRequest(async (request, response) => {
    let id = request.query.id;
    let givenServer = request.query.server;
    let deviceInfo = request.query.deviceInfo;
    let fcmToken = request.query.fcmToken;
    try {
        var db = admin.database();
        var ref = db.ref("/users/" + givenServer + "/" + id + "/info");
        ref.update({
            fcmToken: fcmToken,
            deviceInfo: deviceInfo,
        });
        response.send('Succesful');
    }
    catch (e) {
        console.log(e);
        response.send('error');
    }
});

exports.updateProfile = functions.https.onRequest(async (request, response) => {
    let givenID = request.query.id || 'hzWG9j73Tf';
    let givenServer = request.query.server || 'euw';
    let givenImageUrl = request.query.url || "https://firebasestorage.googleapis.com/v0/b/lolclub.appspot.com/o/images%2F2020-06-04%2012%3A21%3A40.467300.jpg?alt=media&token=20972ae6-674b-42f3-8740-9bea0e82a640";
    let givenMainLane = request.query.main || 'mid';
    let givenSecondaryLane = request.query.secondary || 'support';
    let givenGender = request.query.gender || 'male';

    try {
        var db = admin.database();

        var ref = db.ref("/users/" + givenServer + "/" + givenID);

        ref.once('value').then(snapshot => {

            if (snapshot.exists()) {
                ref.update({
                    'info/imageurl': givenImageUrl,
                    'info/mainlane': givenMainLane,
                    'info/secondarylane': givenSecondaryLane,
                    'info/gender': givenGender,
                });

                let responseBody = {
                    status: 200,
                    message: 'Successful : all went well',
                };
                response.send(responseBody);
            }
            else {
                let responseBody = {
                    status: 404,
                    message: 'Unsuccessful : ID doesnt exist',
                };
                response.send(responseBody);
            }
            return null;
        }).catch(() => {
            let responseBody = {
                status: 404,
                message: 'Unsuccessful',
            };
            response.send(responseBody);
        });
    }
    catch (e) {
        console.log(e);
        let responseBody = {
            status: 404,
            message: 'Unsuccessful',
        };
        response.send(responseBody);
    }
});

exports.getHistory = functions.https.onRequest(async (request, response) => {
    let givenID = request.query.id || 'n62XlnTVgvtUuj494x5zJbno9dne63Fs45TAei2Cu8QOQhoibm59dJau_gHr5gv6SvGXVryJPIqerw';
    let givenServer = request.query.server || 'euw';
    try {

        let userData = await getUserInfoByID(givenID, givenServer);
        let userRank = [];
        userRank.push(userData.flexrank);
        userRank.push(userData.solorank);
        //await updateUserRankingInfoAndMatchHistory(givenID, givenServer, userData.ign);
        var wantedData = [];
        let userInfo = {
            ign: userData.ign,
            mainLane: userData.mainLane,
            secondaryLane: userData.secondaryLane,
            gender: userData.gender,
            imageurl: userData.imageurl,
            rank: userRank,
        };
        wantedData.push(userInfo);
        var matchesList = await getUserMatchListByID(givenID, givenServer);
        wantedData.push(matchesList);
        response.send(wantedData);
    } catch (e) {
        let responseBody = {
            status: 404,
            message: 'Unsuccessful',
        };
        console.log(e);
        response.send(responseBody);
    }
});

exports.get10SwipesById = functions.https.onRequest(async (request, response) => {
    let givenID = request.query.id;
    let givenServer = request.query.server;
    try {
        //TODO : pass the id to get swipes to wanted level .
        var _10Swipes = await get10IdsData(givenID, givenServer);
        response.send(_10Swipes);
    }
    catch (e) {
        console.log();
        response.send('error');
    }
});

exports.sendFriendRequest = functions.https.onRequest(async (request, response) => {

    let givenServer = request.query.server || 'euw';
    let senderID = request.query.senderID || 'DoN1AMlG3CEoVjABi1sW3Yn49QcihTv9oepQu9jJjCEANXnz4txxLc23bGv-nIe-A7EYzHCd9Z4rLw';
    let recieverID = request.query.recieverID || 'n62XlnTVgvtUuj494x5zJbno9dne63Fs45TAei2Cu8QOQhoibm59dJau_gHr5gv6SvGXVryJPIqerw';

    try {
        var dateCreated = getTimestampDate(Date.now());

        var db = admin.database();

        var senderRef = db.ref("/users/" + givenServer + "/" + senderID);
        senderRef.child('pendingSentList').push().set(recieverID);

        var recieverRef = db.ref("/users/" + givenServer + "/" + recieverID);
        recieverRef.child('pendingRecievedList').push().set(senderID);

        let fcmToken = await getFcmToken(recieverID, givenServer);

        let senderInfo = await getUserInfoByID(senderID, givenServer);
        let senderName = senderInfo.ign;

        let senderProfileImageUrl = senderInfo.imageurl;

        let friendsID = await createFriendShipAndGetFriendsID(senderID, recieverID, givenServer, dateCreated);

        var timestamp = Date.now().toString();
        var key = timestamp;

        addToNotifications(recieverID, givenServer, key, {
            expired: false,
            key: key,
            type: FRIEND_REQUEST_METHOD,
            senderID: senderID,
            timeSent: dateCreated,
            status: 'pending',
            ign: senderName,
            imageUrl: senderProfileImageUrl,
            friendsID: friendsID
        });

        const fcm = admin.messaging();

        var payload = {
            notification: {
                title: "Friend Request ",
                body: senderName + " Wants to be your friend",
                clickAction: 'FlUTTER_NOTIFICATION_CLICK',
            },
            data: {
                sound: "default",
                id: senderID,
                server: givenServer,
                ign: senderName,
                method: 'FRIEND_REQUEST',
            }
        };

        fcm.sendToDevice(fcmToken, payload);

        response.send('Succesful');
    }

    catch (e) {
        console.log(e);
        response.send('error')
    }


});

exports.logIn = functions.https.onRequest(async (request, response) => {
    let givenSummName = request.query.name || 'Last WarriorX';
    let givenServer = request.query.server || 'euw';
    let givenCode = request.query.code || '1234';

    //let isVerified=await checkCode(givenSummName,givenServer,givenCode);
    let isVerified = true;

    if (isVerified) {
        var PUUID = await getPUUID(givenSummName, givenServer);
        var db = admin.database();
        var ref = db.ref("/users/" + givenServer + "/" + PUUID);
        let responseBody;
        ref.once('value').then(snapshot => {
            if (snapshot.exists()) {
                ref.update({
                    'info/ign': givenSummName,
                });
                responseBody = {
                    status: 200,
                    message: 'Successful',
                    id: PUUID,
                };
            }
            else {
                responseBody = {
                    status: 404,
                    message: 'Account Couldnt be found',
                };
            }
            response.send(responseBody);
            return null;
        }).catch(() => {
            let responseBody = {
                status: 404,
                message: 'Something went wrong',
            };
            response.send(responseBody);
        });
    }
    else {
        let responseBody = {
            status: 404,
            message: 'Wrong Code',
        };
        response.send(responseBody)
    }

});

exports.getNotifications = functions.https.onRequest(async (request, response) => {
    let givenID = request.query.id || 'n62XlnTVgvtUuj494x5zJbno9dne63Fs45TAei2Cu8QOQhoibm59dJau_gHr5gv6SvGXVryJPIqerw';
    let givenServer = request.query.server || 'euw';
    try {
        let userNotificationData = await getUserNotificationsByID(givenID, givenServer);
        response.send(userNotificationData);
    }
    catch (e) {
        let responseBody = {
            status: 404,
            message: 'Unsuccessful',
            error: e,
        };
        console.log(e);
        response.send(responseBody);
    }
});

exports.acceptFriendRequest = functions.https.onRequest(async (request, response) => {
    let givenID = request.query.id || 'n62XlnTVgvtUuj494x5zJbno9dne63Fs45TAei2Cu8QOQhoibm59dJau_gHr5gv6SvGXVryJPIqerw';
    let senderID = request.query.senderID || 'DoN1AMlG3CEoVjABi1sW3Yn49QcihTv9oepQu9jJjCEANXnz4txxLc23bGv-nIe-A7EYzHCd9Z4rLw';
    let givenServer = request.query.server || 'euw';
    let notificationKey = request.query.key || '1592379045034';
    let friendsID = request.query.friendsID || 'rg4DA6APvC';
    try {
        updateNotification(givenID, givenServer, notificationKey, {
            'expired': true,
            'status': 'accepted',
        });
        updateFriends(givenServer, friendsID, {
            'status': 'friends',
        });
        addToFriendList(givenServer, givenID, friendsID);
        addToFriendList(givenServer, senderID, friendsID);
        response.send('Succesful');
    }
    catch (e) {
        console.log(e);
        response.send(e);
    }


});

exports.rejectFriendRequest = functions.https.onRequest(async (request, response) => {
    let givenID = request.query.id || 'n62XlnTVgvtUuj494x5zJbno9dne63Fs45TAei2Cu8QOQhoibm59dJau_gHr5gv6SvGXVryJPIqerw';
    let senderID = request.query.senderID || 'DoN1AMlG3CEoVjABi1sW3Yn49QcihTv9oepQu9jJjCEANXnz4txxLc23bGv-nIe-A7EYzHCd9Z4rLw';
    let givenServer = request.query.server || 'euw';
    let notificationKey = request.query.key || '1592379045034';
    let friendsID = request.query.friendsID || 'rg4DA6APvC';
    try {
        updateNotification(givenID, givenServer, notificationKey, {
            'expired': true,
            'status': 'rejected',
        });
        updateFriends(givenServer, friendsID, {
            'status': 'rejected',
        });
        response.send('Succesful');
    }
    catch (e) {
        console.log(e);
        response.send(e);
    }
});

exports.getFriendList = functions.https.onRequest(async (request, response) => {
    let id=request.query.id || 'DoN1AMlG3CEoVjABi1sW3Yn49QcihTv9oepQu9jJjCEANXnz4txxLc23bGv-nIe-A7EYzHCd9Z4rLw';
    let server=request.query.server || 'euw';
    try {
        let friendsInfoList = [];
        friendsInfoList = await getFriendsListInfo(id, server);
        response.send(friendsInfoList);
    }
    catch (e) {
        response.send('error');
        console.log(e);
    }
});

exports.testing = functions.https.onRequest(async (request, response) => {
    let id = 'n62XlnTVgvtUuj494x5zJbno9dne63Fs45TAei2Cu8QOQhoibm59dJau_gHr5gv6SvGXVryJPIqerw';
    let server = 'euw';
    try {
       response.send('testing'); 
    }
    catch (e) {
        response.send(e);
    }
});



async function getFriendsListInfo(id, server) {
    return new Promise(async (resolve, reject) => {
        let userFriendIdsList = [];
        let friendsInfoList = [];
        userFriendIdsList = await getUserFriendIdsList(id, server);
        let idsLength=userFriendIdsList.length;
        let i =0;
        userFriendIdsList.forEach(async friendsID => {
            var friendsInfo = await getFriendsInfo(friendsID, server, id);  
            friendsInfoList.push(friendsInfo);
            i++;
            if(i===idsLength)
                resolve(friendsInfoList);
        });
    })
}

//get the friends IDS of a user
async function getUserFriendIdsList(id, server) {
    var db = admin.database();
    var ref = db.ref("/users/" + server + "/" + id + "/friendList");
    return new Promise((resolve, reject) => {
        ref.on('value', snapshot => {
            var friendList = [];
            snapshot.forEach(snap => {
                friendList.push(snap.val());
            });
            resolve(friendList);
        }, reject)
    })
}

//gets the FriendShip info
async function getFriendsInfo(friendsID, server,userID) {
    var db = admin.database();
    var ref = db.ref("/friends/" + server + "/" + friendsID);
    return new Promise((resolve, reject) => {
        ref.on('value',async snapshot => {
            let friendId=snapshot.val().firstUserID !== userID?snapshot.val().firstUserID:snapshot.val().secondUserID;
            let userFriendInfo=await getUserInfoByID(friendId,server);
            let friendsInfo ={
                friendsID: friendsID,
                userFriendID: friendId,
                ign:userFriendInfo.ign,
                imageUrl:userFriendInfo.imageurl,
            };
            resolve(friendsInfo);
        }, reject)
    })
}

async function getPUUID(ign, server) {
    const { puuid: userPUUID } = await kayn.Summoner.by.name(ign).region(server);
    return userPUUID;
}

async function createFriendShipAndGetFriendsID(firstUserID, secondUserID, server, time) {

    var db = admin.database();

    let friendsID = makeid(10);

    var friendsRef = db.ref("/friends/" + server + "/" + friendsID);

    friendsRef.update({
        firstUserID: firstUserID,
        secondUserID: secondUserID,
        friendsSence: time,
        status: 'pending',
    });

    return friendsID;
}

async function updateNotification(id, server, key, updateArea) {
    var db = admin.database();
    var ref = db.ref("/users/" + server + "/" + id + "/notifications/" + key);
    ref.update(updateArea);
}

async function addToFriendList(server, id, friendsID) {
    var db = admin.database();
    db.ref("/users/" + server + "/" + id + "/friendList").push().set(friendsID);
}

async function updateFriends(server, id, updateArea) {
    var db = admin.database();
    var ref = db.ref("/friends/" + server + "/" + id);
    ref.update(updateArea);
}

// Util Function to check if a given Object is empty or not
function isEmpty(obj) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

async function updateUserRankingInfoAndMatchHistory(givenID, givenServer, givenSummName) {

    await updateProfileMatchHistoryViaID(givenID, givenServer);

    let newRankData = await getRankingInfoFromAPI(givenSummName, givenServer);
    var flexBox = 'unranked';
    var soloBox = 'unranked';
    if (!isEmpty(newRankData)) {
        newRankData.forEach(rank => {
            if (rank.queue === 'soloq')
                soloBox = rank;
            else
                flexBox = rank;
        });
    }
    var db = admin.database();
    var ref = db.ref("/users/" + givenServer + "/" + givenID + "/info");
    ref.update({
        solorank: soloBox,
        flexrank: flexBox,
    });
}

async function updateProfileMatchHistoryViaID(givenID, givenServer) {
    let userData = await getUserInfoByID(givenID, givenServer);
    let givenSummName = userData.ign;
    console.log('Updating User : ' + givenSummName + ' Profile . SERVER : ' + givenServer);
    var matchesList = await getLast10MatchHistoryData(givenSummName, givenServer);
    var db = admin.database();
    var ref = db.ref("/users/" + givenServer + "/" + givenID);
    ref.update({
        "matchList": matchesList,
    });
}

async function getRankingInfoFromAPI(givenSummName, givenServer) {
    //TODO : to be changed to come from db
    try {
        const { id: myID } = await kayn.Summoner.by.name(givenSummName).region(givenServer);
        let ranksJSON = await kayn.League.Entries.by.summonerID(myID);
        var returnBody = [];
        ranksJSON.forEach(rank => {
            console.log(rank.queueType);
            if (rank.queueType === 'RANKED_SOLO_5x5') {
                let rankBox = {
                    queue: 'soloq',
                    tier: rank.tier,
                    rank: rank.rank,
                    lp: rank.leaguePoints,
                    wr: Math.round(rank.wins / (rank.wins + rank.losses) * 100),
                };
                returnBody.push(rankBox);
            }
            else {
                let rankBox = {
                    queue: 'flexq',
                    tier: rank.tier,
                    rank: rank.rank,
                    lp: rank.leaguePoints,
                    wr: Math.round(rank.wins / (rank.wins + rank.losses) * 100),
                };
                returnBody.push(rankBox);
            }
        })
        return returnBody;
    } catch (e) {
        console.log(e);
        return ('error');
    }
}

async function getLast10MatchHistoryData(givenSummName, givenServer) {
    var championList;
    championList = await kayn.DDragon.Champion.listDataByIdWithParentAsId();
    championList = championList.data;
    console.log(givenSummName + " / " + givenServer);
    let givenRegion = getRegion(givenServer);
    const { accountId } = await kayn.Summoner.by.name(givenSummName)
        .region(givenServer)
    const { matches } = await kayn.Matchlist.by
        .accountID(accountId)
        .region(givenServer)
        .query({ queue: [420, 440] })
    const gameIds = matches.slice(0, 10).map(({ gameId }) => gameId)
    const requests = gameIds.map(kayn.Match.get).map(x => x.region(givenRegion));
    const results = await Promise.all(requests)
    return new Promise((resolve, reject) => {
        var matchesList = [];
        results.forEach(result => {
            for (i = 0; i < 10; i++) {
                if (result.participantIdentities[i].player.summonerName === givenSummName.toString()) {
                    let totalMinions = result.participants[i].stats.totalMinionsKilled +
                        result.participants[i].stats.neutralMinionsKilled;
                    let ka = result.participants[i].stats.kills + result.participants[i].stats.assists;
                    let championId = result.participants[i].championId.toString();
                    let championName = championList[championId].name;
                    let duration = getGameDuration(result.gameDuration);
                    let gameDate = getTimestampDate(result.gameCreation);
                    let matchWantedData = {
                        win: (result.participants[i].participantId > 5) ? result.teams[1].win : result.teams[0].win,
                        date: gameDate,
                        queue: result.queueId,
                        duration: duration,
                        champion: championName,
                        spell1: result.participants[i].spell1Id,
                        spell2: result.participants[i].spell2Id,
                        kills: result.participants[i].stats.kills,
                        deaths: result.participants[i].stats.deaths,
                        assists: result.participants[i].stats.assists,
                        minions: totalMinions,
                        vision: result.participants[i].stats.visionScore,
                        kp: (result.participants[i].participantId > 5) ? Math.round(ka / getKp(result, true) * 100) : Math.round(ka / getKp(result, false) * 100)
                    };
                    matchesList.push(matchWantedData);
                    break;
                }
            }
        })
        resolve(matchesList);
    });
}

async function get10IdsData(givenID, givenServer) {
    var userIDS = [];
    var db = admin.database();
    var ref = db.ref("/users/" + givenServer);
    let userData = await getUserInfoByID(givenID, givenServer);
    let givenSummName = userData.ign;
    console.log(givenSummName);
    return new Promise((resolve, reject) => {
        ref.once(
            'value',
            snapshot => {
                snapshot.forEach(data => {
                    let userRank = [];
                    userRank.push(data.child('info').child('solorank').val());
                    userRank.push(data.child('info').child('flexrank').val());
                    let usersdata = {
                        id: data.key,
                        ign: data.child('info').child('ign').val(),
                        url: data.child('info').child('imageurl').val(),
                        mainLane: data.child('info').child('mainlane').val(),
                        gender: data.child('info').child('gender').val(),
                        secondaryLane: data.child('info').child('secondarylane').val(),
                        tier: data.child('info').child('solorank').child('tier').val() !== null ? data.child('info').child('solorank').child('tier').val() : 'unranked',
                        rank: data.child('info').child('solorank').child('rank').val(),
                        wr: data.child('info').child('solorank').child('wr').val() !== null ? data.child('info').child('solorank').child('wr').val() : -1,
                        rankingInfo: userRank,
                        matchList: data.child('matchList').val(),
                    };
                    userIDS.push(usersdata);
                })
                resolve(userIDS)
            },
            errorObject => {
                console.log('The read failed: ' + errorObject.code)
                reject(errorObject)
            }
        )
    });
}

function getGameDuration(time) {
    var date = new Date(time * 1e3);
    return (date.getMinutes() + ':' + ((date.getSeconds() < 10) ? '0' + date.getSeconds() : date.getSeconds()));
}

function getTimestampDate(timestamp) {
    var d = new Date(timestamp);
    return ((d.getMonth() + 1) + '/' + +d.getDate() + '/' + d.getFullYear());
}

function getKp(result, flag) {
    // var index = (bool == true) ? 5 : 0;
    let sum = 0;
    if (flag) {
        for (i = 5; i < 10; i++) {
            sum += result.participants[i].stats.kills;
        }
    }
    else {
        for (i = 0; i < 5; i++) {
            sum += result.participants[i].stats.kills;
        }
    }
    return sum;
}

function getRegion(givenServer) {
    switch (givenServer) {
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
        case 'ru':
            return REGIONS.RUSSIA;
        case 'jp':
            return REGIONS.JAPAN;
        case 'kr':
            return REGIONS.KOREA;
        default:
            return REGIONS.NORTH_AMERICA;
    }
}

function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

async function checkCode(givenSummName, givenServer, givenCode) {

    const { id: myID } = await kayn.Summoner.by.name(givenSummName).region(givenServer);

    const code = await kayn.ThirdPartyCode.by.summonerID(myID).region(givenServer);

    console.log(code);

    return code === givenCode;
}

async function getUserInfoByID(id, givenServer) {
    var db = admin.database();
    var ref = db.ref("/users/" + givenServer + "/" + id + "/info");
    return new Promise((resolve, reject) => {
        ref.on('value', snapshot => resolve({
            ign: snapshot.val().ign,
            server: snapshot.val().server,
            mainLane: snapshot.val().mainlane,
            secondaryLane: snapshot.val().secondarylane,
            gender: snapshot.val().gender,
            imageurl: snapshot.val().imageurl,
            flexrank: snapshot.val().flexrank,
            solorank: snapshot.val().solorank,
        }), reject)
    })
}

async function getUserNotificationsByID(id, givenServer) {
    var db = admin.database();
    var ref = db.ref("/users/" + givenServer + "/" + id + "/notifications");
    return new Promise((resolve, reject) => {
        ref.on('value', snapshot => {
            var notifications = [];
            snapshot.forEach(snap => {
                if (!snap.val().expired) {
                    notifications.push(snap.val());
                }
            });
            resolve(notifications);
        }, reject)
    })
}



async function getUserMatchListByID(id, givenServer) {
    var db = admin.database();
    var ref = db.ref("/users/" + givenServer + "/" + id + "/matchList");
    return new Promise((resolve, reject) => {
        ref.on('value', snapshot => resolve(
            snapshot.val()
        ), reject)
    })
}

async function getFcmToken(id, givenServer) {
    var db = admin.database();
    var ref = db.ref("/users/" + givenServer + "/" + id + "/info/fcmToken");
    return new Promise((resolve, reject) => {
        ref.on('value', snapshot => resolve(
            snapshot.val()
        ), reject)
    })
}

async function addToNotifications(id, server, key, notificationData) {
    var db = admin.database();
    var ref = db.ref("/users/" + server + "/" + id + "/notifications");
    ref.once('value').then(snapshot => {
        console.log(key);
        ref.child(key).set(notificationData);
        return null;
    }).catch(() => {
        let responseBody = {
            status: 404,
            message: 'Unsuccessful',
        };
        response.send(responseBody);
    });
}
