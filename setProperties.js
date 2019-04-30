// setProperties.gs
// Note this file is not kept in git repo
// Note: using clasp for git syncing with this project - https://github.com/google/clasp

function setProps() {
  // Applications .id: 0ADEphxv4_hwkUk9PVA
  // Crazy AWP stuff.id: 0ANC9rcmM4HWWUk9PVA
  // IT .id: 0AFTpghoBflPwUk9PVA
  // Quarterly Report Team .id: 0AGUUxRwGZ9q0Uk9PVA
  // Shared Docs .id: 0AFgMNN2I0tOsUk9PVA
  // STESSA .id: 0ACAv80hPxcTrUk9PVA
  // TeamFoldersBackups .id: 0ABF2MikZKXHsUk9PVA
  // Technology Curriculum .id: 0ALhe_n9Z7FZpUk9PVA
  // Travel Working .id: 0AN0WJCM9RIS4Uk9PVA
  // Technology Curriculum id: 0ALhe_n9Z7FZpUk9PVA
  // Outreach id: 0AEZsV-cyKZTcUk9PVA
  // ECASE id: 0AKb4pDaSqn80Uk9PVA

  // This function is used to set the project properties
  // This is needed to be run before backups will work.
  var userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty('reportingEmail', 'dtaylor@21pstem.org'); // email account to send outputs from this script to
  userProperties.setProperty('backupDriveId', '0ABF2MikZKXHsUk9PVA'); // Team Drive used to backup the other team drives
  userProperties.setProperty('skipDriveId', '0AKb4pDaSqn80Uk9PVA'); // Team Drive to skip (along with backup team drive)

}
