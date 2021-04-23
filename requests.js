const https = require('https');

const MAX_REQUESTS = 5;

/*
ids: list of integer ids
url: url with text 'id' as placeholder 
auth: authorization key (string) 

retrieves all ids from source api asynchronously without overloading server. 
*/
async function retrieve_ids(ids, url, auth) {

    options = {
        headers: {"Authorization": auth}
    };

    active_requests = {} //maps id->https request wrapped in a promise
    result = {}; //maps id->response data
    
    var i=0;
    while (i<ids.length) {
        if (Object.keys(active_requests).length < MAX_REQUESTS) {
            req = new Promise((resolve) => {
                var id = ids[i];
                https.request(url.replace("id", id), options, (res)=>{
                    data = "";
                    res.on('data', (chunk)=>{
                        data += chunk;
                    });
                    res.on('end', ()=>{
                        resolve([id, data]); //upon full receipt, return id as well as collected data. 
                    });
                }).on('error', (err)=>{
                    resolve([id, err]); //handling errors passively.  
                }).end();

            });
            active_requests[ids[i]]=req; //store active request as promise
            i+=1;    
        } else { //if we have too many outgoing requests, wait until one is finished before continuing. 
            await Promise.race(Object.values(active_requests)).then((response)=>{
                delete active_requests[response[0]]; //clear request. 
                result[response[0]] = response[1]; //store result. 
            });
        }
    }

    //quiesce the remaining requests
    await Promise.all(Object.values(active_requests)).then((responses)=>{
        for (var j=0;j<responses.length;j++) {
            result[responses[j][0]] = responses[j][1];
        }
    });

    return result;
}

/* 
test with spotify api. ids represent artists. must give spotify valid key through console. 
*/
async function test() {  
    ids = ["2VIdKQmRHnWofsR4odfFOh", "0bouHpX4JiuPnIfP2jFxRi", "0Kekt6CKSo0m5mivKcoH51", "13dkPjqmbcchm8cXjEJQeP", "2LmyJyCF5V1eQyvHgJNbTn", "7y97mc3bZRFXzT2szRM4L4", "2MDkMAXgLEGJFogdR000Au", "1hRLlo7ZGxEmc0ztMOKurs", "5N1GUHhFMRFFgMTjSOJDb9", "20iZXzMb8LoWXOeca32i82", "24K6LTZFqBAvKsorwK0iXd"];
    url = "https://api.spotify.com/v1/artists/id"; 
    auth = 0;
    if (process.argv.length > 3) {auth = `${process.argv[2]} ${process.argv[3]}`;}

    data = retrieve_ids(ids, url, auth);
    data.then((resp)=>{console.log(JSON.stringify(resp, null, 2));})
}

test();