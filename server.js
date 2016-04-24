var express = require('express');
var bodyParser = require('body-parser');
var flatFile = require('flatfile');

var app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());



//direct to index to input the user_id and session_id
app.get('/index.html', function (req, res) {
    res.sendFile( __dirname + "/" + "index.html" );
});



//receive POST from activity
app.post('/activity', function (req, res) {
    console.log("Receive a POST");
    //check if the post in valid
    if (req.body == null || req.body.user_id == null || req.body.session_id == null) {
        res.sendStatus(500);
    }
    else{
        flatFile.db('log.json', function(err, data) {
            //check if we can access log.json
            if (err) {
                console.error(err);
                res.sendStatus(500);
            }
            else {
                var current_time = new Date();
                //push new data into log.json
                data.log.push({
                    user_id:req.body.user_id,
                    session_id:req.body.session_id,
                    time:current_time.toJSON()
                });
                //check if we can save log.json
                data.save(function(err){
                    if (err) {
                        console.error(err);
                        res.sendStatus(500);
                    }
                });
                //we successfully POST new data in log.json
                res.sendStatus(200);
            }
        });
    }
});



//receive GET from stats and return result
app.get('/stats', function (req, res) {
    // check if the date is null
    if(req.query.start_date == null || req.query.end_date == null){
        res.status(500).send("Please input the start_data and end_data");
    }
    //check if the date is valid
    if(!dataIsValid(req.query.start_date) || !dataIsValid(req.query.end_date)){
        res.status(500).send("Please input a valid date, like YYYY-MM-DD");
    }

    //parse the start_data and end_data
    var start_list = req.query.start_date.split("-");
    var end_list = req.query.end_date.split("-");
    var start_date = new Date(start_list[0], start_list[1]-1, start_list[2]);
    var end_date = new Date(end_list[0], end_list[1]-1, end_list[2]);

    //search the log.json to get the needed data
    flatFile.db('log.json', function(err, data) {
        //check if we can read the data in log.json
        if(err){
            console.error(err);
            res.send(500);
        }
        else {
            //A users map, key is the user_id, value is a list of session_if belong to the user
            var users_dict = {};
            var num_sessions = 0;
            var unique_users = 0;

            var list = data.log;
            for (i = 0; i < list.length; i ++) {
                var time = new Date(list[i].time);
                //if the date of this item fit the search condition
                if (start_date <= time && time <= end_date) {
                    //if this user not in the users map, unique_users, num_sessions+1
                    if (users_dict[list[i].user_id] == undefined) {
                        array = new Array();
                        array.push(list[i].session_id);
                        users_dict[list[i].user_id] = array;
                        unique_users += 1;
                        num_sessions += 1;
                    }
                    //if this user in the users map
                    else {
                        array = users_dict[list[i].user_id];
                        flag = true;
                        for (j = 0; j < array.length; j++) {
                            if (array[j] == list[i].session_id)
                                flag = false;
                        }
                        //if this session not in the list of this the user, num_sessions+1
                        if (flag) {
                            array.push(list[i].session_id);
                            num_sessions += 1;
                        }
                    }
                }
            }
            var avg_sessions_per_user = 0;
            if (num_sessions != 0 && unique_users != 0)
                avg_sessions_per_user = num_sessions / unique_users;

            var result = {
                num_sessions:num_sessions,
                unique_users:unique_users,
                avg_sessions_per_user:avg_sessions_per_user
            };

            //we successfully GET needed data in log.json and return it
            res.status(200).json(result);
        }
    });
});



//check if the date is valid
function dataIsValid(date){
    if(date == null)
        return false;
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/))
        return false;

    var date_list = date.split("-");
    year = date_list[0];
    month = date_list[1];
    day= date_list[2];

    if (month < 1 || month > 12 || day < 1 || day > 31)
        return false;
    else if ((month == 4 || month == 6 || month == 9 || month == 11)) {
        if (day == 31)
            return false;
    }
    else if (month == 2)
    {
        var leap_year = (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0));
        if (day > 29 || (day ==29 && !leap_year))
            return false;
    }
    return true;
}



//create a server, port is 8000
var onListen = function() {
    console.log('Server running at http://127.0.0.1:8000/')
};
app.listen(8000, onListen);