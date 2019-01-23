function backupTeamDrives() {
// Applications .id: 0ADEphxv4_hwkUk9PVA
// Crazy AWP stuff.id: 0ANC9rcmM4HWWUk9PVA
// IT .id: 0AFTpghoBflPwUk9PVA
// Quarterly Report Team .id: 0AGUUxRwGZ9q0Uk9PVA
// Shared Docs .id: 0AFgMNN2I0tOsUk9PVA
// STESSA .id: 0ACAv80hPxcTrUk9PVA
// TeamFoldersBackups .id: 0ABF2MikZKXHsUk9PVA
// Technology Curriculum .id: 0ALhe_n9Z7FZpUk9PVA
// Travel Working .id: 0AN0WJCM9RIS4Uk9PVA

  try {
    var backupFolderId = '0ABF2MikZKXHsUk9PVA';
    var backupFolder = DriveApp.getFolderById(backupFolderId);
    Logger.log("Back up to: " + backupFolder.getName());
    var timeZone = Session.getScriptTimeZone();
    var formattedDate = Utilities.formatDate(new Date(), 'UTF', 'yyyy_dd_MM_HH_mm')
    Logger.log("*** getGoogleTeamDrives formattedDate: "+formattedDate);

    var teamDrives = {},
      baseUrl = "https://www.googleapis.com/drive/v3/teamdrives",
      token = ScriptApp.getOAuthToken(),
      params = {
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
      Logger.log("get " + apiUrl + " error: " + response.error);
      response.teamDrives.forEach(function(teamDrive) {
        teamDrives[teamDrive.id] = teamDrive.name;
        Logger.log('Team Drive .name: ' + teamDrive.name);
        Logger.log('Team Drive .id: ' + teamDrive.id);
        if (teamDrive.id === backupFolderId) {
          Logger.log ("SKIP BACKUP FOLDER");
        } else {
          var subBackupFolderMatches = backupFolder.getFoldersByName(teamDrive.name);
          var subBackupFolder;
          Logger.log("*** subBackupFolderMatches.hasNext(): "+subBackupFolderMatches.hasNext());
          while (subBackupFolderMatches.hasNext()) {
            subBackupFolder = subBackupFolderMatches.next();
            Logger.log("*** subBackupFolder.getId(): "+subBackupFolder.getId());
            var delUrl = "https://www.googleapis.com/drive/v3/files/"+subBackupFolder.getId()+"?supportsTeamDrives=true";
            Logger.log("*** delUrl: "+delUrl);
            var accesstoken = ScriptApp.getOAuthToken();
            Logger.log("*** accesstoken: "+accesstoken);
            // delete folder rest api docs: https://developers.google.com/drive/api/v3/reference/files/delete
            resp = UrlFetchApp.fetch(delUrl, {
              method: "DELETE",
              headers: {"Authorization": "Bearer " + accesstoken},
              muteHttpExceptions: false
            });
            Logger.log("RESP: "+resp);
          }
          // Logger.log("*** Create Team Drive folder");
          var tDrive = DriveApp.getFolderById(teamDrive.id);
          subBackupFolder = backupFolder.createFolder(teamDrive.name);
          // Copy all sub folders (recursively)
          copyFolder(subBackupFolder, tDrive);
        }
      })
      params.pageToken = response.nextPageToken;
    } while (params.pageToken);
  } catch (f) {
    Logger.log("error: " + f.toString());
  }
  // return false;
}

function backupTeamDrive() {
  var timeZone = Session.getScriptTimeZone();
  var formattedDate = Utilities.formatDate(new Date(), 'UTF', 'yyyy_dd_MM_HH_mm')
  Logger.log("*** backupTeamDrives formattedDate: "+formattedDate);
  var backupFolder = DriveApp.getFolderById('0ABF2MikZKXHsUk9PVA'); // backup folder
  // teamDrive:
  // Technology Curriculum id: 0ALhe_n9Z7FZpUk9PVA
  // Outreach id: 0AEZsV-cyKZTcUk9PVA
  var teamFolder = DriveApp.getFolderById('0AEZsV-cyKZTcUk9PVA'); // Team folder to backup
  var subBackupFolderMatches = backupFolder.getFoldersByName("Outreach");
  var subBackupFolder;
  Logger.log("*** subBackupFolderMatches.hasNext(): "+subBackupFolderMatches.hasNext());
  while (subBackupFolderMatches.hasNext()) {
    subBackupFolder = subBackupFolderMatches.next();
    Logger.log("*** subBackupFolder.getId(): "+subBackupFolder.getId());
    var delUrl = "https://www.googleapis.com/drive/v3/files/"+subBackupFolder.getId()+"?supportsTeamDrives=true";
    var accesstoken = ScriptApp.getOAuthToken();
    resp = UrlFetchApp.fetch(delUrl, {
      method: "DELETE",
      headers: {"Authorization": "Bearer " + accesstoken},
      muteHttpExceptions: false
    });
    Logger.log("RESP: "+resp);
  }
  Logger.log("*** Create Outreach folder");
  subBackupFolder = backupFolder.createFolder("Outreach");
  // Copy all sub folders (recursively)
  copyFolder(subBackupFolder, teamFolder);
}


function copyFolder(backupFolder, teamFolder) {
  Logger.log("*** backup to folder: "+backupFolder.getName());
  var teamFiles = teamFolder.getFiles();

  // update or create new each file in the team drive folder
  while (teamFiles.hasNext()) {
    var tf = teamFiles.next();
    Logger.log("*** copy team file: " + tf.getName() + " id: " + tf.getId());
    var blob = getFileBlob(tf);
    Logger.log("got file blob, now create file");
    backupFolder.createFile(blob);
  }

  // copy all sub folders in the team drive folder
  var folders = teamFolder.getFolders();
  while (folders.hasNext()) {
    var tfolder = folders.next();
    Logger.log("*** copy team folder: " + tfolder.getName() + " id: " + tfolder.getId());
    // create new folder
    Logger.log("*** Create "+tfolder.getName()+" folder");
    subBackupFolder = backupFolder.createFolder(tfolder.getName());
    copyFolder(subBackupFolder, tfolder);
  }

  return;
}


function getFileBlob(file) {
  var accesstoken = ScriptApp.getOAuthToken();
  var mime = file.getMimeType();
  var name = file.getName();
  Logger.log("***  getFileBlob name: " + name + ", mime: " + mime);
  if (mime == "application/vnd.google-apps.script") {
    blob = UrlFetchApp.fetch("https://script.google.com/feeds/download/export?id=" + e + "&format=json", {
      method: "GET",
      headers: {"Authorization": "Bearer " + accesstoken},
      muteHttpExceptions: false
    }).getBlob().setName(name);
    Logger.log ("***   getFileBlob   google apps script");
  } else if (~mime.indexOf('google-apps')) {
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
    Logger.log ("***   getFileBlobs   google apps mime: " + mimeCode);
    blob = UrlFetchApp.fetch("https://www.googleapis.com/drive/v3/files/" + file.getId() + "/export?mimeType=" + mimeCode[0], {
      method: "GET",
      headers: {"Authorization": "Bearer " + accesstoken},
      muteHttpExceptions: true
    }).getBlob().setName(mimeCode[1]);
  } else {
    blob = UrlFetchApp.fetch("https://www.googleapis.com/drive/v3/files/" + file.getId() + "?alt=media", {
      method: "GET",
      headers: {"Authorization": "Bearer " + accesstoken},
      muteHttpExceptions: true
    }).getBlob().setName(name);
    Logger.log ("***   getFileBlobs   google apps media?");
  }
  return blob;
}



function listFilesInTeamDrive() {
  try {
    var folder = DriveApp.getFolderById('0ADEphxv4_hwkUk9PVA'); // Applications folder
    var files = folder.getFiles();
    while (files.hasNext()){
      file = files.next();
      Logger.log("file: " + file.getName() + " id: " + file.getId() + " size: " + file.getSize())
    }
  } catch(e) {
    Logger.log("error: " + e.toString());
  }
}

//function listUsers() {
//  var optionalArgs = {
//    customer: 'my_customer',
//    maxResults: 10,
//    orderBy: 'email'
//  };
//  var response = AdminDirectory.Users.list(optionalArgs);
//  var users = response.users;
//  if (users && users.length > 0) {
//    Logger.log('Users:');
//    for (i = 0; i < users.length; i++) {
//      var user = users[i];
//      Logger.log('%s (%s)', user.primaryEmail, user.name.fullName);
//    }
//  } else {
//    Logger.log('No users found.');
//  }
//}

function test() {
  var timeZone = Session.getScriptTimeZone();
  var formattedDate = Utilities.formatDate(new Date(), 'UTF', 'yyyy_dd_MM_HH_mm')
  Logger.log("*** backupTeamDrives formattedDate: "+formattedDate);
}

// properly get blobs for all files and sub folders...
// refactored from https://stackoverflow.com/questions/22237799/zip-multiple-folders-in-1-zip-google-drive-scripts#25828907
function getFolderBlobs(parentFolder, parents) {
  var files = parentFolder.getFiles();
  var fileIds = [];
  while (files.hasNext()) {
    var f = files.next();
    Logger.log("*** getFolderBlobs file: " + f.getName() + " id: " + f.getId() + " size: " + f.getSize());
    fileIds.push(f.getId());
  }

  var blobs = getFileBlobs(fileIds, parents);
  var folders = parentFolder.getFolders();
  while (folders.hasNext()) {
    var folder = folders.next();
    // be sure to concatenate the blobs with the full file names (to preserve folder structure in zip file)
    var fPath = parents+"/"+folder.getName()+'/';
    Logger.log("*** getFolderBlobs folder: " + folder.getName() + "@" + fPath);
    // blobs.push(Utilities.newBlob([]).setName(fPath)); //comment/uncomment this line to skip/include empty folders
    blobs = blobs.concat(getFolderBlobs(folder, fPath));
  }
  return blobs;
}



// properly get blobs for files (so files are proper mime types - not all pdfs).
// refactored from https://stackoverflow.com/questions/46918380/is-there-a-way-to-create-a-zip-file-from-multiple-files-on-google-drive-with-the#46920940
function getFileBlobs(fileIds, parents) {
  var names = {}; // hash of names in folder to prevent duplicate names in zip file
  var blobs = [];
  var mimeInf = [];
  var accesstoken = ScriptApp.getOAuthToken();
  fileIds.forEach(function(e) {
    try {
      var file = DriveApp.getFileById(e);
      var mime = file.getMimeType();
      var name = parents+'/'+file.getName();
      // prevent dup names in zip file
      while (names[name]) { name = "*" + name }
      names[name] = true;
    } catch (er) {
      return er
    }
    Logger.log("***   getFileBlobs get file: " + name);
    var blob;
    if (mime == "application/vnd.google-apps.script") {
      blob = UrlFetchApp.fetch("https://script.google.com/feeds/download/export?id=" + e + "&format=json", {
        method: "GET",
        headers: {"Authorization": "Bearer " + accesstoken},
        muteHttpExceptions: false
      }).getBlob().setName(name);
      Logger.log ("***   getFileBlobs   google apps script");
    } else if (~mime.indexOf('google-apps')) {
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
      Logger.log ("***   getFileBlobs   google apps mime: " + mimeCode);
      blob = UrlFetchApp.fetch("https://www.googleapis.com/drive/v3/files/" + e + "/export?mimeType=" + mimeCode[0], {
        method: "GET",
        headers: {"Authorization": "Bearer " + accesstoken},
        muteHttpExceptions: true
      }).getBlob().setName(mimeCode[1]);
    } else {
      blob = UrlFetchApp.fetch("https://www.googleapis.com/drive/v3/files/" + e + "?alt=media", {
        method: "GET",
        headers: {"Authorization": "Bearer " + accesstoken},
        muteHttpExceptions: true
      }).getBlob().setName(name);
      Logger.log ("***   getFileBlobs   google apps media?");
    }
    // blobs.push(blob);
    // instead of building blobs for zip fiile
    // we will output each file to the backup directory (under the appropriate parent folder)
    Logger.log("DIRECTORY: "+parents+", FILE: "+name);
  });
  return blobs;
}

