import { expect, test } from '@playwright/test';
import * as fs from 'fs';

const sleep: number = 50;
const weekdays: string[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const authFile: string = './auth.txt';


// extract creds from authFile
let auth: RegExpMatchArray = fs.readFileSync(authFile).toString().match(/(?<=^\w+?:\s*)\S+/gmi);
const uid: string = auth[0];
const pwd: string = auth[1];
auth = null;

// prebuild content strucuture
const txtFile: string[] = fs.readFileSync('ressources/tasks.csv','utf8').toString().split("\n"); // 1-D
let txtFileMap: Map<number, Map<string, string>> = new Map(); // maps lines of tasks.csv
let maxTaskTime: number = 0;

// parse txtFile and build txtFileMap
for (let lineIndex: number = 0; lineIndex < txtFile.length; lineIndex++) {
  if (lineIndex === 0) continue; // Headers
  const line: string = txtFile[lineIndex].trim().replace(/^;+|;+$/g, '');

  if (line === '') continue; // skip empty lines

  const lineValues: string[] = line.split(';');
  let lineMap: Map<string, string> = new Map();
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
        lineMap.set('Qualification', lineValues[i]); // allow to be splitted by ',' later on
        break;
      case 4:
        lineMap.set('Content', lineValues[i]);
        break;
      default: //variadic input of content
        lineMap.set('Content', lineMap.get('Content') + "\n" + lineValues[i]);
    };
  };
  
  txtFileMap.set(Number(lineIndex) + 1, lineMap);
  
  const taskTime: number  = Number(lineMap.get('Duration').replace(',', '.'));
  if (taskTime > maxTaskTime) maxTaskTime = taskTime;
};



// Precompute content for faster filling and possible get to know of errors beforehand
let contentMap: Map<string, Map<number, Map<string, string>>> = new Map(); // Map<Weekday, Map<row, Map<key, field>>>
let commentStr: string = '';

for (const day of weekdays) { // loop days
  let taskMap: Map<number, Map<string, string>> = new Map(txtFileMap); // refresh task set

  // let taskCatDay: Map<number, string> = new Map<number, string>()
  let taskCatDay: Map<string, Set<number>> = new Map(); //holds Category and Set of corresponding taskIDs
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
    const randInt: number = (Math.random() * taskMapIndex.length) << 0;
    const taskID: number = taskMapIndex[randInt]; // bitwise operation converts to integer


    // dayIDs.push(taskID.toString());
    const task: Map<string, string> = taskMap.get(taskID);
    const category: string = task.get('Category');

    if (taskCatDay.has(category)) { // create or append Set value
      const sameCatSet: Set<number> = taskCatDay.get(category);
      sameCatSet.add(taskID)
      taskCatDay.set(category, sameCatSet)
    } else {
      taskCatDay.set(category, new Set([taskID]))
    }

    taskMap.delete(taskID); // delete to prevent redundant selection from randomizer

    timeLeft -= Number(task.get('Duration').replace(',', '.')); // task duration gets deducted from timeLeft

  }

  
  
  commentStr += day.substring(0, 2) + ':{'
  
  let dayTasks: Map<number, Map<string, string>> = new Map();
  let dayTasksIndex: number = 0;
  // merge fields values of same selected categories
  for (const taskCat of taskCatDay) {
    // let taskCatSet: Set<number> = 
    const catArray: number[] = Array.from(taskCatDay.get(taskCat[0])); // taskIDs of same category in taskCatDay to Array
    commentStr +=  catArray.join(',') + ','
    
    let dayCatTasks: Map<string, string> = new Map();
    let durations: number =  0;
    let qualis: string[] = [];
    let contents: string = '';
    
    for (const taskID of catArray) { // aggregate task times and qualifications
      durations += Number(txtFileMap.get(taskID).get('Duration').replace(',', '.'));

      let subQualis: string[] = txtFileMap.get(taskID).get('Qualification').split(','); //if csv field has multiple qualifications
      qualis.push(...subQualis);

      if (contents !== '') contents += "\n";
      contents += txtFileMap.get(taskID).get('Content');
    }

    dayCatTasks.set('Category', taskCat[0]);
    dayCatTasks.set('Duration', durations.toString());
    dayCatTasks.set('Qualification', [...new Set(qualis)].join(',')); // find unique values in qualis
    dayCatTasks.set('Content', contents);

    dayTasks.set(dayTasksIndex, dayCatTasks);
    dayTasksIndex++;
  }

  commentStr += '};';
  
  contentMap.set(day, dayTasks);
}


// main 
test('BLok', async ({ page }) => {
  // await page.pause();
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
  await page.pause();
  

  // Week Filling
  await expect(page).toHaveURL(/http[s]:\/\/www\.online-ausbildungsnachweis\.de\/blok\/report(;jsessionid=\S*)?(\?\d+)?/); //report


  for (const days of contentMap) { // loop days
    for (const rows of days[1]) { // loop day rows/tasks
      // main filling
      if (rows[0] !== 0) await page.locator(`[name="tableComp:${days[0]}:addRow"]`).click(); // default day has one empty task field

      // content
      await page.locator(`textarea[name="tableComp:${days[0]}:inputs:${rows[0]}:report"]`).fill(`${rows[1].get('Category')}:\n\t\n${rows[1].get('Content')}`);
      await page.waitForTimeout(sleep);


      // assess
      await page.locator(`//textarea[@class="report"][@name="tableComp:${days[0]}:inputs:${rows[0]}:report"]/../../*[@class="assessContainer"]/*[@class="reportbbpcnt"]/a`).click();
      await page.locator('.keyskill_evaluation_slider >> nth=0').click();

      // TODO: find out 
      // await page.locator(`input[name"panel:assForm:trainee:green:evalValue"][type="hidden"]`).evaluate(node => node.setAttribute('value', taskMap.get(taskID)[2]));
      await page.locator('div.button >> text=Speichern').click();
      await page.waitForTimeout(sleep);
      

      // qualifications
      await page.locator(`//textarea[@class="report"][@name="tableComp:${days[0]}:inputs:${rows[0]}:report"]/../../*[@class="qualiContainer"]/*[@class="reportbbpcnt"]/a`).click();
      for (const quali of rows[1].get('Qualification').split(',')) {
        await page.locator(`tr:has(td:has-text("${quali}")) >> td >> a >> nth=0`).click();
      }
      await page.locator('div.button >> text=Ok').click();
      await page.waitForTimeout(sleep);


      // duration
      await page.locator(`input[name="tableComp:${days[0]}:inputs:${rows[0]}:has"]`).fill(rows[1].get('Duration'));
      await page.waitForTimeout(sleep);
    };  
  };

  // IDs of inputted lines
  await page.locator('textarea[name="tableComp:commentsContainer:comment"]').fill(commentStr);

  await page.locator('input[name="department:dep"]').fill('IT');
  await page.focus('text=Bemerkungen:');
  await page.locator('text=Bemerkungen:').click(); // on BLok textfields saves when out of focus
});