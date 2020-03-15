const express = require('express');
const multer = require('multer');
var bodyParser=require('body-parser');
const path = require('path');
const app = express();
var fs = require("fs");
var pdfreader = require("pdfreader");
//var Rule = require('pdfreader').Rule;
const port = process.env.PORT || 3000;
const helpers = require('./helpers');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}))
app.use(express.static(__dirname + '/public'));
app.set('view engine','ejs');
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/');
    },

    // By default, multer removes file extensions so let's add them back
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
app.post('/upload-profile-pic', (req, res) => {
    // 'profile_pic' is the name of our file input field in the HTML form
    let upload = multer({ storage: storage, fileFilter: helpers.imageFilter }).single('profile_pic');

    upload(req, res, function(err) {
        // req.file contains information of uploaded file
        // req.body contains information of text fields, if there were any

        if (req.fileValidationError) {
            return res.send(req.fileValidationError);
        }
        else if (!req.file) {
            return res.send('Please select a pdf file to upload');
        }
        else if (err instanceof multer.MulterError) {
            return res.send(err);
        }
        else if (err) {
            return res.send(err);
        }
        res.render('success',{filename:req.file.filename});
        //document.getElementById("lbl").style.color="Green";
        // Display uploaded image for user validation
        //res.send(`You have uploaded this image: <hr/><img src="${req.file.path}" width="500"><hr /><a href="./">Upload another image</a>`);
    });
});

app.get('/',(req,res)=>{
    res.render('index');
});
app.post('/format',(req,res)=>{
    var filename=req.body.filename;
    var branch=req.body.branch;
    if(branch=="OverAllCollege"){
        branch="";
    }
    var yoa=req.body.yeo;
    var pattern = "VJC"+yoa.slice(-2)+branch;
    var format=req.body.format;
    var fullfilepath=path.join(__dirname+'/uploads/'+filename);
    console.log(fullfilepath);
    var totalnoofstudents=0;
    var total_failures=0;
    var noofsubjects=0;
    var subjectwise=[];
    var totalstudentssubjectwise=[];
    var subjectwisepass=[];
    var subjectwisepasspercentage=[];
    var rows = {}; // indexed by y-position
    var subjects=[];
    var subjectnames=[];
   
    for(i=0;i<50;i++){
        subjectwise[i]=0;
        totalstudentssubjectwise[i]=0;
        subjectwisepass[i]=0;
        subjectwisepasspercentage[i]=0.0;
    }
 
    function printRows() {
    //   Object.keys(rows) // => array of y-positions (type: float)
    //     .sort((y1, y2) => parseFloat(y1) - parseFloat(y2)) // sort float positions
    //     .forEach(y => console.log((rows[y] || []).join("")));
    

        Object.keys(rows).forEach(x => {
            if(rows[x][0].match(pattern)){
                for(i=0;i<rows[x].length;i++){
                    //subjectwise[i]=0;
                    //totalstudentssubjectwise[i]=0;
                    if(rows[x][i].match('(F)'||'(Absent)')){
                        total_failures++;
                        //console.log(total_failures+"failed students"+rows[x][i])
                        break;
                    }
                }
                totalnoofstudents++;                
            } 
        });


       if(branch!=""){
            Object.keys(rows).forEach(x => {
                if(rows[x][0].match(pattern)){
                subjects=rows[x][1].split(',');
                if(noofsubjects<subjects.length){
                    noofsubjects=subjects.length;
                }
                    for(i=0;i<subjects.length;i++){
                        if(subjects[i].match('(F)'||'(Absent)')){}
                        else{
                            subjectnames[i]=subjects[i].substring(0,subjects[i].indexOf('('));
                        }
                            
                        
                        if(subjects[i].match('(F)'||'(Absent)')){
                            subjectwise[i]+=1;
                        }
                        totalstudentssubjectwise[i]+=1;
                    }                                          
                } 
            });
       }
      
        


    }
     
    new pdfreader.PdfReader().parseFileItems(fullfilepath, function(err, item) {
        if(!item){
            // console.log("Total Students"+totalnoofstudents);
            var overallpasspp=(totalnoofstudents-total_failures)*100/totalnoofstudents;
            // console.log("Total Failures"+total_failures);
            // console.log("Subjectwise"+subjectwise);
            // console.log("Total StudentsSubjectwise"+totalstudentssubjectwise);
            for(i=0;i<noofsubjects;i++){
                subjectwisepass[i]=totalstudentssubjectwise[i]-subjectwise[i];
                subjectwisepasspercentage[i]=subjectwisepass[i]*100/totalstudentssubjectwise[i];
            }
            console.log(subjectnames.length);
            if(branch!=""){
                res.render('printdept', { title: branch+" Dept",ta:totalnoofstudents,tp:totalnoofstudents-total_failures,pp:overallpasspp,
                                        ts:noofsubjects,sns:subjectnames,tss:totalstudentssubjectwise,
                                        sp:subjectwisepass,spp:subjectwisepasspercentage
                                    });
            }
            else{
                res.render('print', { title: 'VJCET',ta:totalnoofstudents,tp:totalnoofstudents-total_failures,pp:overallpasspp});
            }
        }
        else if (!item || item.page) {
            // end of file, or page
            printRows();
            //console.log("PAGE:", item.page);
            rows = {}; // clear rows for next page
        } else if (item.text) {
            // accumulate text items into rows object, per line
            (rows[item.y] = rows[item.y] || []).push(item.text);
        }
    });
  
   

     
});
app.listen(port, () => console.log(`Listening on port ${port}...`));