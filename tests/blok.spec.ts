import { expect, test } from '@playwright/test';
import * as fs from 'fs';

const sleep: number = 50;
const days: string[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const authFile: string = './auth.txt';


// extract creds from authFile
let auth: RegExpMatchArray = fs.readFileSync(authFile).toString().match(/(?<=^\w+?:\s*)\S+/gmi);
const uid: string = auth[0];
const pwd: string = auth[1];
auth = null;

// prebuild content strucuture
const txtFile: string[] = fs.readFileSync('ressources/tasks.csv','utf8').toString().split("\n"); // 1-D
let contentMap: Map<number, Map<string, string>> = new Map(); // maps lines of tasks.csv
let maxTaskTime: number = 0;

// parse txtFile and build contentMap
for (let lineIndex: number = 0; lineIndex < txtFile.length; lineIndex++) {
  if (lineIndex === 0) continue; // Headers
  const line: string = txtFile[lineIndex].trim().replace(/^;+|;+$/g, '');

  if (line === '') continue; // skip empty lines

  const lineValues: string[] = line.split(';');
  let lineMap: Map<string, string> = new Map<string, string>();
  for (let i: number = 0; i < lineValues.length; i++) {
    switch (i) {
      case 0:
        lineMap.set('Category', lineValues[i]);
        break;
      case 1:
        lineMap.set('Duration', lineValues[i]);
        break;
      case 2:
        lineMap.set('Assessment', lineValues[i]);
        break;
      case 3:
        lineMap.set('Qualification', lineValues[i]);
        break;
      case 4:
        lineMap.set('Content', lineValues[i]);
        break;
      default: //variadic input of content
        lineMap.set('Content', lineMap.get('Content') + "\n" + lineValues[i]);
    };
  };
  
  contentMap.set(Number(lineIndex) + 1, lineMap);
  
  const taskTime: number  = Number(lineMap.get('Duration').replace(',', '.'));
  if (taskTime > maxTaskTime) maxTaskTime = taskTime;
};


// main 
test('BLok', async ({ page }) => {
  await page.goto('https://www.online-ausbildungsnachweis.de/blok/login');

  // Login
  await expect(page).toHaveURL(/http[s]:\/\/www\.online-ausbildungsnachweis\.de\/blok\/login(;jsessionid=\S*)?(\?\d+)?/); //login
  await expect(page).toHaveTitle(/BLok/);
  await page.fill('input[name="uid:border:classAdder:field"]', uid);
  await page.fill('input[name="pwd:border:classAdder:field"]', pwd);
  await page.locator('a[name="submitLogin"]').click();

  // Navigation
  await expect(page).toHaveURL(/http[s]:\/\/www\.online-ausbildungsnachweis\.de\/blok\/home(;jsessionid=\S*)?(\?\d+)?/); //home
  // await page.locator('#berichtsheft >> text=Berichtsheft').click(); // Goto
  console.log('Choose empty new week');
  await page.pause();
  

  // Week Filling
  await expect(page).toHaveURL(/http[s]:\/\/www\.online-ausbildungsnachweis\.de\/blok\/report(;jsessionid=\S*)?(\?\d+)?/); //report


  let contentIDs: string[] = []; // to be inserted in comments
  for (const day of days) { // loop days
    let dayIDs: string[] = []; // array of object, each with chosen taskIDs
    let taskMap: Map<number, Map<string, string>> = contentMap; // refresh task set
    let timeLeft: number = 8;
    let maxTaskTimeDay: number = maxTaskTime;
    
    
    for (let i = 0; timeLeft > 0; i++) { // loop day tasks
      
      if (maxTaskTimeDay > timeLeft){ // find tasks longer than timeleft and remove them
        maxTaskTimeDay = 0;

        // filter tasks with duration longer than timeLeft
        for (const task of taskMap) {
          const taskTime: number = Number(task[1].get('Duration').replace(',', '.')); // convert decimal symbol

          if (taskTime > timeLeft){
            taskMap.delete(task[0]);
          } else if (taskTime > maxTaskTimeDay) maxTaskTimeDay = taskTime;
        };
      };
      const taskMapIndex: number[] = Array.from(taskMap.keys()); // index map for random access

      // get random task from taskMap
      const randInt: number = (Math.random() * (taskMapIndex.length + 1)) << 0;
      const taskID: number = taskMapIndex[randInt]; // bitwise operation converts to integer
      
      dayIDs.push(taskID.toString());
      const task: Map<string, string> = taskMap.get(taskID);
      taskMap.delete(taskID); // delete to prevent redundant selection from randomizer

      timeLeft -= Number(task.get('Duration').replace(',', '.')); // task duration gets deducted from timeLeft


      // main filling
      if (i !== 0) await page.locator(`[name="tableComp:${day}:addRow"]`).click(); // default day has one empty task field

      // content
      await page.locator(`textarea[name="tableComp:${day}:inputs:${i}:report"]`).fill(`${task.get('Category')}:\n\t\n${task.get('Content')}`);
      await page.waitForTimeout(sleep);


      // assess
      await page.locator(`//textarea[@class="report"][@name="tableComp:${day}:inputs:${i}:report"]/../../*[@class="assessContainer"]/*[@class="reportbbpcnt"]/a`).click();
      await page.locator('.keyskill_evaluation_slider >> nth=0').click();

      // TODO: find out 
      // await page.locator(`input[name"panel:assForm:trainee:green:evalValue"][type="hidden"]`).evaluate(node => node.setAttribute('value', taskMap.get(taskID)[2]));
      await page.locator('div.button >> text=Speichern').click();
      await page.waitForTimeout(sleep);
      

      // qualifications
      await page.locator(`//textarea[@class="report"][@name="tableComp:${day}:inputs:${i}:report"]/../../*[@class="qualiContainer"]/*[@class="reportbbpcnt"]/a`).click();
      await page.locator(`tr:has(td:has-text("${task.get('Qualification')}")) >> td >> a >> nth=0`).click();
      await page.locator('div.button >> text=Ok').click();
      await page.waitForTimeout(sleep);


      // duration
      await page.locator(`input[name="tableComp:${day}:inputs:${i}:has"]`).fill(task.get('Duration'));
      await page.waitForTimeout(sleep);
    };

    contentIDs.push(day.substring(0, 2) + ':{'+dayIDs.join(';')+'}'); // weekobject
  };

  // IDs of inputted lines
  contentIDs.flat();
  await page.locator('textarea[name="tableComp:commentsContainer:comment"]').fill(contentIDs.join(';'));

  await page.locator('input[name="department:dep"]').fill('IT');
  await page.focus('text=Bemerkungen:');
  await page.locator('text=Bemerkungen:').click(); // on BLok textfields saves when out of focus
  console.log('Finished week');
  await page.pause();
});