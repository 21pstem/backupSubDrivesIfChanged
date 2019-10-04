// BackupDrives
// Google App Script that backs up all Team Drives into a backup folder.
// Note: All backup files are office versions (ie google format files are converted to .xlsx, .docx, and pptx formats)
// Note: To identify converted files, they have extensions of either: .gs.xlsx, .gs.docx, or .gs.pptx
// Note: New applications must call setProps() of setProperties.gs
// Note: When creating a new application from the git repo, copy and edit the setProperties.example.gs
// Note: does not backup the backup folder plua an additional folder specified by the skipDriveId property
// Note: using clasp for git syncing with this project - https://github.com/google/clasp
// Note: to set up clasp, see: https://developers.google.com/apps-script/guides/clasp

// ToDo: make skipDriveId property a JSON array to allow skipping multiple drives
// ToDo: Automatically skip deleting and rebuilding drives if nothing has changed (check dates in all sub-folders and files)

function backupOnlyOneTeamDrive() {
  var scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty("OneTime", "_AWP test drive");
  scriptProperties.setProperty("OneTest", "_AWP test drive");
  //scriptProperties.setProperty("OneTime", "_test AWP");
  //scriptProperties.setProperty("OneTest", "_test AWP");
  //scriptProperties.setProperty("OneTime", "Applications");
  //scriptProperties.setProperty("OneTime", "Cairo office");
  //scriptProperties.setProperty("OneTime", "CapstoneAppMaterials");
  //scriptProperties.setProperty("OneTime", "Component 2 Working");
  //scriptProperties.setProperty("OneTime", "CurriculumAppMaterials");
  //scriptProperties.setProperty("OneTest", "CurriculumAppMaterials");
  //scriptProperties.setProperty("OneTime", "ECASE");
  //scriptProperties.setProperty("OneTime", "English");
  //scriptProperties.setProperty("OneTime", "IHE Working");
  //scriptProperties.setProperty("OneTime", "Leadership Working");
  //scriptProperties.setProperty("OneTime", "Outreach");
  //scriptProperties.setProperty("OneTime", "PDI Working");
  //setBackupStatusCode("PDI Working", 'split');
  //scriptProperties.setProperty("OneTime", "Quarterly Report Team");
  //scriptProperties.setProperty("OneTime", "STEAM School Working");
  //scriptProperties.setProperty("OneTime", "STESSA - Conshy Internal Staff ONLY");
  //scriptProperties.setProperty("OneTime", "STESSA Events");
  //scriptProperties.setProperty("OneTime", "STESSA Personnel Travel Documents (Passports & ELFs) - JB & DRD Access ONLY");
  //scriptProperties.setProperty("OneTime", "STESSA Shared Docs");
  //setBackupStatusCode("STESSA Shared Docs", 'split');
  //scriptProperties.setProperty("OneTime", "STESSA Technology (Umbrella, Tracker, Curriculum, Captsone Apps)");
  //scriptProperties.setProperty("OneTime", "STESSA");
  ////scriptProperties.setProperty("XOneTimeX", "TeamFoldersBackups");
  //scriptProperties.setProperty("OneTime", "Technology Curriculum");
  //scriptProperties.setProperty("OneTime", "Travel Working");
  //scriptProperties.setProperty("OneTime", "vvvvv");
  //scriptProperties.setProperty("Debugging", "true");
  backupTeamDrives();
  // clears OneTime script variable for running a team backup one time only
  scriptProperties.setProperty("OneTime", "");
  // clears OneTest script variable for testing date logic on OneTime runs
  scriptProperties.setProperty("OneTest", "");
  //scriptProperties.setProperty("Debugging", "false");
}


function backupTeamDrives() {
  var scriptProperties = PropertiesService.getScriptProperties();
 
  getProps();  // log the current script properties for the app

  var errors = [];  // array of errors for emailed error report (sent to email address in reportingEmail property);
  //try {
    var backupFolderId = scriptProperties.getProperty('backupDriveId');
    //Logger.log("backupFolderId "+backupFolderId);
    var backupFolder = DriveApp.getFolderById(backupFolderId);
    var buDrive = DriveApp.getFolderById(backupFolderId);
    var debugging = scriptProperties.getProperty("Debugging");
    var oneTime = scriptProperties.getProperty("OneTime");
    var oneTest = scriptProperties.getProperty("OneTest");
    if (oneTest != "" && oneTime !== oneTest) {
      oneTime == "";
      oneTest == "";
      var msg = Utilities.formatString("One Time and One Test mismatch: %s, %s",oneTime, oneTest);
      console.info(msg);
      errors = errors.concat(getReportMessage('', '', msg));
    }
    if (oneTime !== "") {
      // one time run for a specific team drive. Logging and reporting will indicate skip for all other team drives.
      var msg = Utilities.formatString("One Time run to only back up team drive: %s",oneTime);
      console.info(msg);
      errors = errors.concat(getReportMessage('', '', msg));
    }
    
    // Get the team drives assigned to this user
    var baseUrl = "https://www.googleapis.com/drive/v3/teamdrives";
    var token = ScriptApp.getOAuthToken();
    var params = {
        pageSize: 99,
        fields: "nextPageToken,teamDrives(id,name)"
      };
    do {
      var queryString = Object.keys(params).map(function(p) {
        return [encodeURIComponent(p), encodeURIComponent(params[p])].join("=");
      }).join("&amp;");
      var apiUrl = baseUrl + "?" + queryString;
      var response = JSON.parse(
        UrlFetchApp.fetch( apiUrl, {
          method: "GET",
          headers: {"Authorization": "Bearer " + token}
        }).getContentText());
      response.teamDrives.forEach(function(teamDrive) {
        var teamDriveName = teamDrive.name
        
        var buStatus = getBackupStatus (teamDriveName);
        // If oneTime run, set the status flags appropriately
        if (oneTime !== "") {
          // backup of the matching drive
          if (oneTime === teamDriveName) {
            if (buStatus.code === 'skip') {
              // if set to skip, set it to full
              // otherwise leave type of backup alone
              buStatus.code = 'full';
            }
          } else {
            // skip other team drives
            buStatus.code = 'skip';
          }
        }
        var today = Utilities.formatDate(new Date(), 'UTF', 'yyyy_MM_dd_HH_mm');
        switch(buStatus.code) {
          case "skip":
            // go on to next team drive
            errors = errors.concat(getReportMessage(teamDriveName, '', 'SKIPPED backup of team drive'));
            break;
          case 'full':
            var lastModF = Utilities.formatDate(buDrive.getDateCreated(), 'UTF', 'yyyy_MM_dd_HH_mm');
            // Get the folder from the team drive ID
            var tDriveFolder = DriveApp.getFolderById(teamDrive.id);
            var lastDateF = Utilities.formatDate(getLastDateInFolder(tDriveFolder, new Date(2000, 1, 1)), 'UTF', 'yyyy_MM_dd_HH_mm');
            Logger.log("lastDateF: %s", lastDateF);
            // console.log("lastModF: %s, buStatus.started: %s, lastDateF: %s", lastModF, buStatus.started, lastDateF);
            errors = errors.concat(getReportMessage(teamDriveName, '', msg));
            if (buStatus.completed === "" || lastDateF > buStatus.started) {
              // mark team drive as started
              if (debugging === "true") {
                var msg = Utilities.formatString("Debugging full Team drive %s - lastModF: %s, buStatus.started: %s, lastDateF: %s", teamDriveName, lastModF, buStatus.started, lastDateF);
                console.log(msg);
                errors = errors.concat(getReportMessage(teamDriveName, '', msg));
              } else {
                var msg = Utilities.formatString("Started full Team drive %s - lastModF: %s, buStatus.started: %s, lastDateF: %s", teamDriveName, lastModF, buStatus.started, lastDateF);
                console.info(msg);
                errors = errors.concat(getReportMessage(teamDriveName, '', msg));
                setBackupStatus(teamDriveName, 'full', today, '');
                errors = errors.concat(deleteBuFolders(teamDriveName, buDrive));
                // now create a new empty one for the backups to go to
                var newBackupFolder = buDrive.createFolder(teamDriveName);
                var tDrive = DriveApp.getFolderById(teamDrive.id);
                errors = errors.concat(copyFiles(tDrive, newBackupFolder, teamDriveName));
                errors = errors.concat(copySubFolders(tDrive, newBackupFolder, teamDriveName));
                // mark team drive as completed
                setBackupStatus(teamDriveName, 'full', today, today);
              }
              var msg = Utilities.formatString("Completed Backup for Team drive %s at %s", teamDriveName, new Date());
              console.info(msg);
              errors = errors.concat(getReportMessage(teamDriveName, '', msg));
            } else {
              var msg = Utilities.formatString("Skipped team drive %s - lastModF: %s, buStatus.started: %s, lastDateF: %s", teamDriveName, lastModF, buStatus.started, lastDateF);
              console.info(msg);
              errors = errors.concat(getReportMessage(teamDriveName, '', msg));
            }
           break;
          case 'split':
            var lastModF = Utilities.formatDate(buDrive.getDateCreated(), 'UTF', 'yyyy_MM_dd_HH_mm');
            //var newBackupFolder = buDrive.createFolder(teamDriveName);
            var oldBackupFolder = getFirstFolderByName(buDrive, teamDriveName);
            var tDrive = DriveApp.getFolderById(teamDrive.id);
            
            var msg;
            // check the root files status
            var buStatus = getBackupStatus (teamDriveName+".root");
            if (buStatus.completed === "" || lastDateF > buStatus.started) {
              msg = Utilities.formatString("SPLIT FILES started for Team drive %s at %s", teamDriveName, new Date());
              console.info(msg);
              errors = errors.concat(deleteBuFiles(oldBackupFolder));
              errors = errors.concat(copyFiles(tDrive, oldBackupFolder, teamDriveName));
              // to do - conditionally copy files - this attempts to copy all if any has changes
              // to do - compare all files in team drive, copy if newer, delete any left over files 
              //if (shouldBuFiles(tDrive, oldBackupFolder, buStatus)) {
              //  
              //  errors = errors.concat(getReportMessage(teamDriveName, '', msg));
              //  setBackupStatus(teamDriveName+".root", 'full', today, today);
              //}
            }              
            
            errors = errors.concat(splitSubFolders(tDrive, oldBackupFolder, teamDriveName));
            // mark team drive as completed
            var today = Utilities.formatDate(new Date(), 'UTF', 'yyyy_MM_dd_HH_mm');
            break;
          case 'splitsub':
            // under development:
            var lastModF = Utilities.formatDate(buDrive.getDateCreated(), 'UTF', 'yyyy_MM_dd_HH_mm');
            var oldBackupFolder = getFirstFolderByName(buDrive, teamDriveName);
            var tDrive = DriveApp.getFolderById(teamDrive.id);
            
            var msg;
            // check the root files status
            var buStatus = getBackupStatus (teamDriveName+".root");
            if (buStatus.completed === "" || lastDateF > buStatus.started) {
              Logger.log("*** Start Split Sub Split file copy for: %s", teamDriveName);
              msg = Utilities.formatString("SPLIT SUB SPLIT FILES started for Team drive %s at %s", teamDriveName, new Date());
              console.info(msg);
              errors = errors.concat(deleteBuFiles(oldBackupFolder));
              errors = errors.concat(copyFiles(tDrive, oldBackupFolder, teamDriveName));
              Logger.log("*** Finished Split Sub Split file copy for: %s", teamDriveName);
            } else {
              Logger.log("*** Skip Split Sub Split file copy for: %s", teamDriveName);
            }
            
            errors = errors.concat(splitSubSplitSubFolders(tDrive, oldBackupFolder, teamDriveName));
            // mark team drive as completed
            var today = Utilities.formatDate(new Date(), 'UTF', 'yyyy_MM_dd_HH_mm');
            Logger.log("*** finished Split Sub Split Team Drive copy for: %s", teamDriveName);
            break;
          default:
            msg = Utilities.formatString("SPLIT SUB SPLIT FOLDERS ERROR backup - INVALID STATUS CODE for Team drive %s at %s", teamDriveName, new Date());
            console.info(msg);
            errors = errors.concat(getReportMessage(teamDriveName, '', msg));
       }
        //Logger.log("*** finished Team Drive copy for: %s", teamDriveName);
      })
      params.pageToken = response.nextPageToken;
    } while (params.pageToken);
  //} catch (f) {
  //  msg = Utilities.formatString("Main Loop error: %s",f);
  //  console.info(msg);
  //  errors = errors.concat(getReportMessage('', '', msg));
  //}
  //console.info("start building email message");
  var messages = ["<table><tr><th>Team Drive</th><th>Folders</th><th>File</th><th>Message</th></tr>"];
  for (err in errors) {
    // skip null errors (where did that come from?)
    if (!!err) {
      var e = errors[err];
      if (e) {
        var message = ["<tr><td>"+e['teamDrive']+"</td><td>"+e['folders']+"</td><td>"+e['filename']+"</td><td>"+e['errMsg']+"</td></tr>"];
        messages.push(message);
      }
    }
  }
  messages.push("</table>");
  MailApp.sendEmail({
    to: scriptProperties.getProperty('reportingEmail'),
    subject: 'Team Drives Backed up Report',
    htmlBody: "<h1>Team Drives Backed up Report</h1><br>"+messages.join('<br>')+"<br>Done"
  });
  //console.info("Email message sent, App is done.");
}

function deleteBuFolders(folderName, backupFolder) {
  var errors = [];
  var subBackupFolderMatches = backupFolder.getFoldersByName(folderName);
  var subBackupFolder;
  Logger.log("*** deleteBuFolders: "+folderName);
  // loop through all matching folder names
  while (subBackupFolderMatches.hasNext()) {
    subBackupFolder = subBackupFolderMatches.next();
    Logger.log("*** deleteBuFolders delete - "+subBackupFolder.getName());
    var delUrl = "https://www.googleapis.com/drive/v3/files/"+subBackupFolder.getId()+"?supportsTeamDrives=true";
    //Logger.log("*** delUrl: "+delUrl);
    var accesstoken = ScriptApp.getOAuthToken();
    //Logger.log("*** accesstoken: "+accesstoken);
    
    // delete folder rest api docs: https://developers.google.com/drive/api/v3/reference/files/delete
    resp = UrlFetchApp.fetch(delUrl, {
      method: "DELETE",
      headers: {"Authorization": "Bearer " + accesstoken},
      muteHttpExceptions: true
    });
    errors = errors.concat(getErrors(folderName, "", subBackupFolder, 'Delete backup folder ('+subBackupFolder+")", resp));    
  }
   return errors;  
}

// Empty all folders and files in the folder specified by the folderName
function deleteBuFiles(backupFolder) {
  var errors = [];
  //console.info("*** deleteBuFiles: %s", backupFolder.getName());
  var innerFiles = backupFolder.getFiles();
  while (innerFiles.hasNext()) {
    var bf = innerFiles.next();
    //console.info("*** delete bu file %s", bf.getName());
    var delUrl = "https://www.googleapis.com/drive/v3/files/"+bf.getId()+"?supportsTeamDrives=true";
    var accesstoken = ScriptApp.getOAuthToken();
    // delete file rest api docs: https://developers.google.com/drive/api/v3/reference/files/delete
    resp = UrlFetchApp.fetch(delUrl, {
      method: "DELETE",
      headers: {"Authorization": "Bearer " + accesstoken},
      muteHttpExceptions: true
    });
    errors = errors.concat(getErrors(backupFolder.getName(), "", bf.getName(), 'Delete backup file ('+bf.getName()+")", resp));
  }

  return errors;  
}

function getFirstFolderByName(parentFolder, folderName) {
  Logger.log("*** getFirstFolderByName: %s", folderName);
  var errors = [];
  var folderMatches = parentFolder.getFoldersByName(folderName);
  var matchedFolder;
  if (folderMatches.hasNext()) {
    matchedFolder = folderMatches.next();
    Logger.log("*** hasNext folder name: %s", matchedFolder.getName());
  }
  if (!matchedFolder) {
    Logger.log("*** missing backup folder, create it")
    matchedFolder = parentFolder.createFolder(folderName);
  }
  return matchedFolder;  
}


// object to store the backup status of a team drive (kept in a script property)
// status:
//    skip - always skip this team folder (such as the backup folder)
//    full - always do a backup of all files in the team folder to a folder in the backup team drive
//    split - (testing) do a full backup of all top level folders in the team drive to subfolders in the backup folder
// started: yyyy_mm_dd_hh_mm formatted date/time for when backup of this team drive started
// completed: yyyy_mm_dd_hh_mm formatted date/time for when backup of this team drive was finised
//    note: at start of backup it is set to an empty string.
function BackupStatus(code, started, completed) {
  this.code = code;
  this.started = started;
  this.completed = completed;
}


// determine how to backup this team drive from script property (team drive / folder name)
function getBackupStatus (folderName) {
  var scriptProperties = PropertiesService.getScriptProperties();

  //Logger.log('backupStatus folderName: ' + folderName);
  if(scriptProperties.getKeys().indexOf('status_'+folderName)==-1) {
    // missing script property, create it as default full backup
    scriptProperties.setProperty('status_'+folderName,"full;;");
  }
  var prop = scriptProperties.getProperty('status_'+folderName);
  var props = prop.split(";");
  var ret = new BackupStatus(props[0],props[1],props[2]);
  //Logger.log(ret);
  return ret;
}

function setBackupStatus(folderName, status, started, completed) {
  Logger.log('setBackupStatus folderName: %s to %s, %s, %s', folderName, status, started, completed);

  var scriptProperties = PropertiesService.getScriptProperties();
  var newStat = Utilities.formatString("%s;%s;%s", status, started, completed);
  scriptProperties.setProperty('status_'+folderName,newStat);
  var ret = new BackupStatus(status, started, completed);
  Logger.log(ret);
  return ret;
}

function setBackupStatusCode(folderName, code) {
  Logger.log('setBackupStatusCode folderName: %s to %s', folderName, code);
  buStatus = getBackupStatus (folderName);
  buStatus.code = code;
  setBackupStatus(folderName, buStatus.code, buStatus.started, buStatus.completed)
  Logger.log(buStatus);
  return buStatus;
}

// list all script properties in key order
// Keeping in order keeps split team drive properties together
function listAllProperties() {
  
  // property settings once used.
  //setBackupStatus("TeamFoldersBackups", 'skip', '', '');
  //setBackupStatus("", 'skip', '', '');
  //setBackupStatus("English", 'skip', '', '');
  //setBackupStatus("STESSA Technology (Umbrella, Tracker, Curriculum, Captsone Apps)", 'split', '', '');
  //setBackupStatus("STESSA Technology (Umbrella, Tracker, Curriculum, Captsone Apps)", 'full', '', '');
  //setBackupStatus("ECASE", 'skip', '', '');
  //setBackupStatus("HE Summer 2019 (working)", 'split', '', '');
  setBackupStatus("_AWP test drive", 'splitsub', '', '');

  var scriptProperties = PropertiesService.getScriptProperties();
  
  scriptProperties.setProperty("OneTime", "");
  scriptProperties.setProperty("OneTest", "");

  var scriptKeys = scriptProperties.getKeys();
  Logger.log(scriptKeys);
  var list = {};
  var keys = [];
  for (var key in scriptKeys) {
    var keyStr = scriptKeys[key]
    keys.push(keyStr);
    var stat = scriptProperties.getProperty(keyStr)
    var props = stat.split(";");
    list[keyStr] = props;
  }
  keys.sort();
  for (var i = 0; i < keys.length; i++) {
    Logger.log("key: %s = value: %s", keys[i], list[keys[i]])
  }
}


// copy just the sub folders of this drive/folder being backed up.
function copySubFolders(teamFolder, backupFolder, parentDirs) {
  //console.info('copySubFolders folderName: ' + parentDirs);
  //console.info('copySubFolders backupFolder: ' + backupFolder.getName());
  var scriptProperties = PropertiesService.getScriptProperties();
  
  var errors = [];

  // copy all sub folders in the team drive folder
  var folders = teamFolder.getFolders();
  try {
  while (folders.hasNext()) {
    var tfolder = folders.next();
    var thisFolderName = parentDirs+"."+tfolder.getName();
    //console.info("*** copy team folder: " + tfolder.getName() + " id: " + tfolder.getId());
    // create new folder
    var subBackupFolder;
    subBackupFolder = backupFolder.createFolder(tfolder.getName());
    errors = errors.concat(copyFiles(tfolder, subBackupFolder, thisFolderName));
    errors = errors.concat(copySubFolders(tfolder, subBackupFolder, thisFolderName));
    //Logger.log("*** finished sub folder: " + thisFolderName);
  }
  } catch (err) {
    var msg = Utilities.formatString("ERROR copySubFolders parentDirs %s - folder: %s - error: %s", parentDirs, backupFolder.getName(), err);
    console.info(msg);
    errors = errors.concat(getReportMessage(parentDirs, backupFolder.getName(), msg));
  }
 
  return errors;
}

// copy just the files.
function copyFiles(teamFolder, backupFolder, parentDirs) {
  var scriptProperties = PropertiesService.getScriptProperties();
  var debugging = scriptProperties.getProperty("Debugging");
  var errors = [];
  var teamFiles = teamFolder.getFiles();

  // update or create new each file in the team drive folder
  while (teamFiles.hasNext()) {
    var tf = teamFiles.next();
    //Logger.log("-- Copy file %s",tf.getName());
    //var fileModDate = Utilities.formatDate(tf.getLastUpdated(), "GMT+5", "yyyy-MMM-dd")
    if (debugging === "true") {
      Logger.log("Debugging - To create file %s",tf.getName());
    } else {
      var retBlob = getFileBlob(teamFolder, parentDirs, tf);
      var blob = retBlob[0];
      errors = errors.concat(retBlob[1]);
      //Logger.log("got file blob, now create file!");
      try {
        // if blob is error JSON, then pass up the error
        if (blob.getDataAsString().length < 1000) {
          errs = getErrors(teamFolder, parentDirs, tf, 'get file blob ('+backupFolder+'/'+tf.getName()+')',blob.getDataAsString());
          if (errs.length > 0) {
            errors = errors.concat(errs);
          }
        }
        // create the file from the blob regardless of error
        //Logger.log("Created file %s",tf.getName());
        newFile = backupFolder.createFile(blob);
      } catch (err) {
        Logger.log("create file "+tf.getName()+" ERROR: "+err);
        errors.push( {
          teamDrive: teamFolder,
          folders: parentDirs,
          filename: tf.getName(),
          fileId: tf.getId(),
          note: "Exception caught",
          errMsg: err
        } );
      }
    }

    //Logger.log("--- finished : " + folderName + " - " + parentDirs + " - " + tf.getName());
  } // end while (teamFiles.hasNext())

  return errors;
}


// not working yet. condider raplacing with single file by file copy
function shouldBuFiles(teamFolder, backupFolder, buStatus) {
  var errors = [];
  //console.info("splitSubFiles %s, %s", teamFolder.name, backupFolder.getName());
  //console.info("splitSubFiles backupFolder: %s", backupFolder.getName());
  var lastModF = Utilities.formatDate(backupFolder.getDateCreated(), 'UTF', 'yyyy_MM_dd_HH_mm');
  //console.info("splitSubFiles backupFolder last backup at: %s", lastModF);

  var lastDateF = Utilities.formatDate(new Date(2000, 1, 1), 'UTF', 'yyyy_MM_dd_HH_mm');
  var innerFiles = teamFolder.getFiles();
  while (innerFiles.hasNext()) {
    var tf = innerFiles.next();
    var newDate = Utilities.formatDate(tf.getDateCreated(), 'UTF', 'yyyy_MM_dd_HH_mm');
    if (newDate > lastDateF) {
      //console.info("Update modified date from %s to %s for %s", lastDateF, newDate, tf.getName());
      lastDateF = newDate;
    } else {
      //console.info("dont modify date from %s to %s for %s", newDate, lastDateF, tf.getName());      
    }
  }
  
  //console.info("splitSubFiles lastDateF: %s", lastDateF);

  var buStatus = getBackupStatus (teamFolder);
  //console.info("splitSubFiles buStatus: %s", buStatus);

  if (buStatus.completed === "" || lastDateF > buStatus.started) {
    //console.info("splitSubFiles return true");
    return true;
  } else {
    //console.info("splitSubFiles return false");
    return false;  
  }
}



// do separate backups to backups team drive for each sub folder
function splitSubFolders(teamFolder, backupFolder, parentDirs) {
  //Logger.log('splitSubFolders backupFolder.getName(): %s', backupFolder.getName());
  var scriptProperties = PropertiesService.getScriptProperties();
  //var debugging = scriptProperties.getProperty("Debugging");

  var errors = [];

  var folders = teamFolder.getFolders();
  while (folders.hasNext()) {
    var tfolder = folders.next();
    var thisFolderName = parentDirs+"."+tfolder.getName();
    // create new folder
    var buStatus = getBackupStatus (thisFolderName);
    //console.info('split splitSubFolders tFolder: %s', tfolder.getName());
    var subBackupFolder = getFirstFolderByName(backupFolder, tfolder.getName());
    var lastModF = "";
    if (subBackupFolder) {
      // old backup folder exists, check the date
      //console.info("split subBackupFolder: %s", subBackupFolder.getName());
      lastModF = Utilities.formatDate(subBackupFolder.getDateCreated(), 'UTF', 'yyyy_MM_dd_HH_mm');
      //console.info("split subBackupFolder last backup at: %s", lastModF);
    }
    var lastDateF = Utilities.formatDate(getLastDateInFolder(tfolder, new Date(2000, 1, 1)), 'UTF', 'yyyy_MM_dd_HH_mm');
    if (buStatus.completed === "" || lastDateF > buStatus.started) {
      var msg = Utilities.formatString("STARTED Backup for Split Team drive %s at %s", thisFolderName, new Date());
      console.info(msg);
      errors = errors.concat(getReportMessage(thisFolderName, '', msg));
      errors = errors.concat(deleteFolder(subBackupFolder));
      subBackupFolder = backupFolder.createFolder(tfolder.getName());
      errors = errors.concat(copyFiles(tfolder, subBackupFolder, thisFolderName));
      errors = errors.concat(copySubFolders(tfolder, subBackupFolder, thisFolderName));
      var today = Utilities.formatDate(new Date(), 'UTF', 'yyyy_MM_dd_HH_mm');
      setBackupStatus(thisFolderName, 'full', today, today);
      var msg = Utilities.formatString("Finished Split Team drive folder %s - lastModF: %s, buStatus.started: %s, lastDateF: %s", thisFolderName, lastModF, buStatus.started, lastDateF);
      console.info(msg);
      errors = errors.concat(getReportMessage(thisFolderName, '', msg));
    } else {
      Logger.log('Skipped splitSubFolders tFolder: %s', tfolder.getName());
    }
  }
  return errors;
}

function splitSubSplitSubFolders(teamFolder, backupFolder, parentDirs) {
  Logger.log('splitSubSplitSubFolders teamFolder: %s', teamFolder);
  Logger.log('splitSubSplitSubFolders backupFolder.getName(): %s', backupFolder.getName());
  Logger.log('splitSubSplitSubFolders parentDirs: %s', parentDirs);
  
  var scriptProperties = PropertiesService.getScriptProperties();
  var errors = [];
 var folders = teamFolder.getFolders();
  while (folders.hasNext()) {
    var tfolder = folders.next();
    var thisFolderName = parentDirs+"."+tfolder.getName();
    var buStatus = getBackupStatus (thisFolderName);
    Logger.log('split splitSubSplitSubFolders tFolder: %s', tfolder.getName());
    //console.info('split splitSubSplitSubFolders tFolder: %s', tfolder.getName());
    var subBackupFolder = getFirstFolderByName(backupFolder, tfolder.getName());
    var lastModF = "";
    if (subBackupFolder) {
      // old backup folder exists, check the date
      Logger.log("split subBackupFolder: %s", subBackupFolder.getName());
      //console.info("split subBackupFolder: %s", subBackupFolder.getName());
      lastModF = Utilities.formatDate(subBackupFolder.getDateCreated(), 'UTF', 'yyyy_MM_dd_HH_mm');
      Logger.log("split subBackupFolder last backup at: %s", lastModF);
      //console.info("split subBackupFolder last backup at: %s", lastModF);
    }
    var lastDateF = Utilities.formatDate(getLastDateInFolder(tfolder, new Date(2000, 1, 1)), 'UTF', 'yyyy_MM_dd_HH_mm');
    if (buStatus.completed === "" || lastDateF > buStatus.started) {
      var msg = Utilities.formatString("STARTED Backup for Split Team drive %s at %s", thisFolderName, new Date());
      console.info(msg);
      //errors = errors.concat(getReportMessage(thisFolderName, '', msg));
      //errors = errors.concat(deleteFolder(subBackupFolder));
      //subBackupFolder = backupFolder.createFolder(tfolder.getName());
      //errors = errors.concat(copyFiles(tfolder, subBackupFolder, thisFolderName));
      //errors = errors.concat(copySubFolders(tfolder, subBackupFolder, thisFolderName));
      //var today = Utilities.formatDate(new Date(), 'UTF', 'yyyy_MM_dd_HH_mm');
      //setBackupStatus(thisFolderName, 'full', today, today);
      //var msg = Utilities.formatString("Finished Split Team drive folder %s - lastModF: %s, buStatus.started: %s, lastDateF: %s", thisFolderName, lastModF, buStatus.started, lastDateF);
      //console.info(msg);
      //errors = errors.concat(getReportMessage(thisFolderName, '', msg));
    } else {
      Logger.log('Skipped splitSubSplitSubFolders tFolder: %s', tfolder.getName());
    }
  }
  return errors;

//   var msg;
//   // check the root files status
//   var buStatus = getBackupStatus (teamDriveName+".root");
//   if (buStatus.completed === "" || lastDateF > buStatus.started) {
//     msg = Utilities.formatString("SPLIT FILES started for Team drive %s at %s", teamDriveName, new Date());
//     console.info(msg);
//     errors = errors.concat(deleteBuFiles(oldBackupFolder));
//     errors = errors.concat(copyFiles(tDrive, oldBackupFolder, teamDriveName));
//   }              
  
//   errors = errors.concat(splitSubFolders(tDrive, oldBackupFolder, teamDriveName));
//   // mark team drive as completed
//   var today = Utilities.formatDate(new Date(), 'UTF', 'yyyy_MM_dd_HH_mm');
}

function deleteFolder(folder) {
  var errors = [];
  // delete folder rest api docs: https://developers.google.com/drive/api/v3/reference/files/delete
  //console.info("*** deleteFolder delete - %s", folder.getName());
  var delUrl = "https://www.googleapis.com/drive/v3/files/"+folder.getId()+"?supportsTeamDrives=true";
  //Logger.log("*** delUrl: "+delUrl);
  var accesstoken = ScriptApp.getOAuthToken();
  //Logger.log("*** accesstoken: "+accesstoken);
  
  resp = UrlFetchApp.fetch(delUrl, {
    method: "DELETE",
    headers: {"Authorization": "Bearer " + accesstoken},
    muteHttpExceptions: true
  });
  errors = errors.concat(getErrors(folder.getName(), "", "", 'Delete backup folder ('+folder.getName()+")", resp));    
}

function getErrors(teamDriveName, folders, file, note, response) {
  var errors = [];
  try {
    if (response.length > 0) {
      var resp = JSON.parse(response);
      for (var i in resp.error.errors) {
        errors.push( {
          teamDrive: teamDriveName,
          folders: folders,
          filename: file.getName(),
          fileId: file.getId(),
          note: note,
          errMsg: resp.error.errors[i].message
        } );
      }
    }
  } catch (err) {
    Logger.log("+++ catch err: "+err+" on response: "+response);
    errors.push("response parse error: "+err);
  }
  return errors;
}

function getReportMessage(teamDriveName, filename, note) {
  var errors = [];
  // simply push the single message into the errors object
  errors.push( {
    teamDrive: teamDriveName,
    folders: "",
    filename: filename,
    fileId: "",
    note: note,
    errMsg: note
  } );
  return errors;
}

function shouldBackup (teamFolder, backupFolder) {
  //Logger.log ("shouldBackup started for %s ", teamFolder.name);
  var teamFolder2 = DriveApp.getFolderById(teamFolder.id);
  var lastDate = getLastDateInFolder(teamFolder2, new Date(2000, 1, 1));
  //Logger.log("*** actual last updated: %s, %s", lastDate, (+lastDate > 0));

  if (+lastDate > 0) {
    //Logger.log("have last date > 0");
    var subBackupFolderMatches = backupFolder.getFoldersByName(teamFolder.name);
    //Logger.log("Matching backup folders for: %s", teamFolder.name);

    var backupLastDate = new Date(2000, 1, 1);
    // check last date modified in the backups
    // loop to process files matching names
    // will use the (last) matching folder's create date
    while (subBackupFolderMatches.hasNext()) {
      var subBackupFolder = subBackupFolderMatches.next();
//      console.info("Matched folder: %s", subBackupFolder.getName());
      var backupLastDate = subBackupFolder.getDateCreated();
      // var thisLastDate = getLastDateInFolder(backupFolder);
      //if (+thisLastDate > +backupLastDate) {
//      console.info ("set last backup date to %s", backupLastDate);
      //  backupLastDate = thisLastDate;
      //} else {
      //  console.info ("skip setting backup date for %s", thisLastDate);
      //}
    }
    //Logger.log("updates have been done since backup %s", (backupLastDate < lastDate));
    if (backupLastDate < lastDate) {
      //console.info ("----- Do backup because %s < %s", backupLastDate, lastDate);
      return true;
    } else {
      //console.info ("----- Skip backup because %s >= %s", backupLastDate, lastDate);
      return false;
    }
  } else {
    //console.info ("----- Skip backup because lastDate <= 0");
    return false;
  }

}



// get the last date modified in a team drive
// Note: regular drives accurately get the last modified date
// Team drives must be calculated from the sub files and top level folders
function getLastDateInFolder(parentFolder, priorLastDate) {
  try {

    //Logger.log("getLastDateInFolder' started for %s", drive.name);
    //var lastMod = drive.getLastUpdated();
    //Logger.log("drive last date gotten");
    //var lastModF = Utilities.formatDate(lastMod, 'UTF', 'yyyy_MMM_dd_HH_mm')
    //Logger.log("drive last date: $s",lastModF);
    // var ret = lastModF;
    var ret = priorLastDate;
    //console.info("getLastDateInFolder parentFolder: %s", parentFolder.name);
    //var parentFolder2 = DriveApp.getFolderById(parentFolder.id);
    var folders = parentFolder.getFolders();
    //Logger.log ("loop through folders");
    while (folders.hasNext()) {
      var folder = folders.next();
      //console.info("*** got folder %s - %s modified at: %s ", folder.getId(), folder.getName(), folder.getLastUpdated());
      //ret = folder.getLastUpdated();
      var newDate = getLastDateInFolder(folder, ret)
      if (+newDate > +ret) {
        //ret = folder.getLastUpdated();
        ret = newDate;
        //console.info("Update modified date to %s from folder %s", ret, folder.getName());
      }
    }

    var fileMatches = parentFolder.getFiles();
    while (fileMatches.hasNext()) {
      var file = fileMatches.next();
      //console.info("getLastDateInFolder got file: %s / %s with last mod date: %s", parentFolder.getName(), file.getName(), file.getLastUpdated());
      if (+file.getLastUpdated() > +ret) {
        ret = file.getLastUpdated();
        //console.info("Update modified date to %s from file %s", ret, file.getName());
      } else {
        //console.info("not updated for date: %s", file.getLastUpdated());
      }
    }

  } catch (err) {
    console.info("getLastDateInFolder error "+err);
    ret = new Date(2000, 1, 1);
  }

  return ret;
}



function copyFolder(backupFolder, teamFolder, teamDriveName, parentDirs) {
  //Logger.log("*** backup to folder: "+backupFolder.getName());
  //Logger.log("*** teamDriveName: "+teamDriveName);
  //console.info("Folder: '%s' - '%s' started", teamDriveName, backupFolder);

  var errors = [];
  var teamFiles = teamFolder.getFiles();

  // update or create new each file in the team drive folder
  while (teamFiles.hasNext()) {
    var tf = teamFiles.next();
    var fileModDate = Utilities.formatDate(tf.getLastUpdated(), "GMT+5", "yyyy-MMM-dd")
    //Logger.log("--- start : " + teamDriveName + " - " + parentDirs + " - " + tf.getName() + " - " + fileModDate);
    // Note we do not need to check existing files in backup directory, as we have previously deleted the entire directory
    //var buFilesMatched = backupFolder.getFilesByName();
    //var matchedFile = null;
    //while (buFilesMatched.hasNext()) {
    //  if (matchedFile === null) {
    //    matchedFile = buFilesMatched.next();
    //  } else {
    //    var dupFile = buFilesMatched.next();
    //    Logger.log("WARNING - duplicate file name for " + dupFile);
    //  }
    //  var file = buFilesMatched.next();
    //  Logger.log(file.getName());
    //}

    var retBlob = getFileBlob(teamDriveName, parentDirs, tf);
    var blob = retBlob[0];
    errors = errors.concat(retBlob[1]);
    //Logger.log("got file blob, now create file!");
    try {
      // if blob is error JSON, then pass up the error
      if (blob.getDataAsString().length < 1000) {
        errs = getErrors(teamDriveName, parentDirs, tf, 'get file blob ('+backupFolder+'/'+tf.getName()+')',blob.getDataAsString());
        if (errs.length > 0) {
          errors = errors.concat(errs);
        }
      }
      // create the file from the blob regardless of error
      newFile = backupFolder.createFile(blob);
    } catch (err) {
      //Logger.log("create file "+tf.getName()+" ERROR: "+err);
      errors.push( {
        teamDrive: teamDriveName,
        folders: parentDirs,
        filename: tf.getName(),
        fileId: tf.getId(),
        note: "Exception caught",
        errMsg: err
      } );
    }
    //Logger.log("--- finished : " + teamDriveName + " - " + parentDirs + " - " + tf.getName());
  }


  // copy all sub folders in the team drive folder
  var folders = teamFolder.getFolders();
  while (folders.hasNext()) {
    var tfolder = folders.next();
    //Logger.log("*** copy team folder: " + tfolder.getName() + " id: " + tfolder.getId());
    // create new folder
    //Logger.log("*** Create "+tfolder.getName()+" folder");
    var subBackupFolder = backupFolder.createFolder(tfolder.getName());
    errors = errors.concat(copyFolder(subBackupFolder, tfolder, teamDriveName, parentDirs+tfolder.getName()));
    //Logger.log("*** finished sub folder: " + tfolder.getName() + " id: " + tfolder.getId());
  }

  return errors;
}


function getFileBlob(teamDriveName, parentDirs, file) {
  var errors = [];
  var accesstoken = ScriptApp.getOAuthToken();
  var mime = file.getMimeType();
  var name = file.getName();
  var blob;
  if (mime == "application/vnd.google-apps.script") {
    //Logger.log("***  getFileBlob mime: google-apps.script, name: " + name + ", mime: " + mime);
    resp = UrlFetchApp.fetch("https://script.google.com/feeds/download/export?id=" + e + "&format=json", {
      method: "GET",
      headers: {"Authorization": "Bearer " + accesstoken},
      muteHttpExceptions: true
    });
    errors = errors.concat(getErrors(teamDriveName, parentDirs, file, "getFileBlob gs ('+name+')", resp));
    blob = resp.getBlob().setName(name);
  } else if (~mime.indexOf('google-apps')) {
    //Logger.log("***  getFileBlob mime: google-apps, name: " + name + ", mime: " + mime);
    var mimeCode;
    switch (mime) {
      case "application/vnd.google-apps.spreadsheet" :
        mimeCode = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", name + ".gd.xlsx"];
        break;
      case "application/vnd.google-apps.document" :
        mimeCode = ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", name + ".gd.docx"];
        break;
      case "application/vnd.google-apps.presentation" :
        mimeCode = ["application/vnd.openxmlformats-officedocument.presentationml.presentation", name + ".gd.pptx"];
        break;
      default: ["application/pdf", name + ".pdf"];
    }
    //Logger.log ("***   getFileBlobs   google apps mime: " + mimeCode);
    try {
      resp = UrlFetchApp.fetch("https://www.googleapis.com/drive/v3/files/" + file.getId() + "/export?mimeType=" + mimeCode[0], {
        method: "GET",
          headers: {"Authorization": "Bearer " + accesstoken},
            muteHttpExceptions: true
      });
      errors = errors.concat(getErrors(teamDriveName, parentDirs, file, "getFileBlob ga ("+name+")", resp));
      blob = resp.getBlob().setName(mimeCode[1]);
    } catch (err) {
      var errMsg = "cannot export file " + name + " (mime: " + mimeCode + ", error: "+err;
      Logger.log(errMsg);
      console.log(errMsg);
      errors.push( {
        teamDrive: teamDriveName,
        folders: parentDirs,
        filename: file,
        fileId: '',
        note: "getFileBlob ga Exception caught",
        errMsg: errMsg
      } );
    }
  } else {
    //Logger.log("***  getFileBlob mime: other, name: " + name + ", mime: " + mime);
    try {
      resp = UrlFetchApp.fetch("https://www.googleapis.com/drive/v3/files/" + file.getId() + "?alt=media", {
        method: "GET",
          headers: {"Authorization": "Bearer " + accesstoken},
            muteHttpExceptions: true
      });
      errors = errors.concat(getErrors(teamDriveName, parentDirs, file, "getFileBlob other ("+name+")", resp));
      blob = resp.getBlob().setName(name);
    } catch (err) {
      var errMsg = "cannot export file " + name + " (mime: " + mimeCode + ", error: "+err;
      Logger.log(errMsg);
      console.log(errMsg);
      errors.push( {
        teamDrive: teamDriveName,
        folders: parentDirs,
        filename: file,
        fileId: '',
        note: "getFileBlob other Exception caught",
        errMsg: errMsg
      } );
    }
  }
  return [blob, errors];
}


function getProps() {
  // this lists the current property settings out to the log
  var scriptProperties = PropertiesService.getScriptProperties();
  var email = scriptProperties.getProperty('reportingEmail'); // email account to send outputs from this script to
  Logger.log ("reportingEmail Property: "+email);
  var backupId = scriptProperties.getProperty('backupDriveId'); // Team Drive used to backup the other team drives
  Logger.log ("backupDriveId Property: "+backupId);
}

function setPrepProps() {
  var scriptProperties = PropertiesService.getScriptProperties();
  //scriptProperties.setProperty("status_TeamFoldersBackups","skip;;");
  //Logger.log(scriptProperties.getProperty("status_TeamFoldersBackups"));
  scriptProperties.setProperty("status_STESSA Events","split;;");
  Logger.log(scriptProperties.getProperty("status__STESSA Events"));
  
}
