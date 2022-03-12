[![License](https://img.shields.io/github/license/Synertry/BLokFiller?color=ADD8E6)](https://github.com/Synertry/BLokFiller/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](https://www.typescriptlang.org/)


# BLokFiller

Automatically fills your online trainee report book on [BLok](https://www.online-ausbildungsnachweis.de/)[^1].

![BLokFiller Demo](https://github.com/Synertry/Media/blob/main/GIF/BLokFillerDemo.gif)


## Requirements

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/en/about/)
- [NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [npx](https://www.npmjs.com/package/npx)
- [TypeScript](https://www.typescriptlang.org/)
- [PlayWright](https://playwright.dev/)
- CLI (Command-line interface) basics

_Follow the [Installation](https://github.com/Synertry/BLokFiller#Installation) to fulfill all requirements_


## Installation

Skip any of these if you have them already, e.g. Git

1. Download and install [Git](https://git-scm.com/downloads)
2. Download and install the latest [Node.js](https://nodejs.org/en/download/current/) or optionally use a [version manager](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm#using-a-node-version-manager-to-install-nodejs-and-npm)[^2]
3. Run from cli
```bash
npm i -g npm@latest
```
4. Switch in cli to your dedicated Git-Folder or anywhere else approppiate and run
```
git clone https://github.com/Synertry/BLokFiller.git
```
5. Switch in cli to the created directory BLokFiller and run
```
npm i
```
6. Lastly run once this once, to be sure the browsers are installed
```
npx playwright install
```

You now have the working script ready.


## Usage

Open the BLokFiller directory and be sure to switch ther with cli too.
In the project directory is an `auth.txt` where you have to replace the template credentials. Do not change the order! The parsing depends on it.
```txt
uid:youruserid
pwd:yourpassword
```

The content will be filled from `ressources/tasks.csv`.
If you are doing the vocation as an application developer the generic tasks should suffice for now.
For all other vocation paths see the [ressources](https://github.com/Synertry/BLokFiller#Ressources)

From the cli run
```
npx playwright test --project=chromium
```
_You can also use firefox or safari_

After a short compiling time a browser windows should open and you will land logged in on the BLok homepage
Navigate **manually** to an empty/new week and resume the execution in the Playwright inspector (click the green arrow at the top).
The browser will close automatically after finishing to fill.
You have to manually release the week.
_Currently if the filling the filling lags, then a time field will be skipped. Check these by inputting the missing hours sum up to the max allowed time, e.g. 8 hours._

Repeat for another week to fill.


## Ressources

Most likely you may have to change the tasks because you either are taking on a different vocation or to include more company related tasks.
The file at `ressources/tasks.csv`needs to be changed accordingly for that. I recommend an spreadsheet editor like Excel. You can add as many content for one category as you need/like, each cell will be written to a new line. But I have not tested more than three columns.

A valid row needs to be filled with these:
- Kategorie: The category for you content (umbrella term)
- Dauer: The time for the tasks in hours. Decimals are supported with `.`  or `,`, but stick to minimum 0.5 steps. More detailed times are not recommended.
- Rating: A value for the assessment **WIP: it defaults to 2 atm**[^3]
- Lernfeld: Which qualification the task belongs to (supports only one atm)
- Inhalt#: Your actual content, what you would write in a normal report book with out all the extras from BLok. Each cell gets written to one line

The ressources are written without umlauts *(ä, ö, ü)*. If you can, avoid them.
Having a big list can lead to undesired side-effects.


## TODO

- [x] Swap content array with hashmap for less iteration
- [x] Write manual/README
- [x] Have at least ~~100~~ 70 generic tasks with proper spread of task time
- [x] Support more qualifications for one task
- [ ] Auto-release when no time fields has been skipped.
- [ ] Get the selector for rating to work
- [ ] Detect filled fields and adjust time accordingly
- ~~[ ] Oneclick-installer~~


## Footnotes

[^1]: This is actually not fully automatic more like a guided tool.
[^2]: On Windows I personally recommend [winget](https://www.microsoft.com/store/productId/9NBLGGH4NNS1) from the Microsoft Store
[^3]: Hidden DOM elements in Playwright are completely locked. In normal environment it would be as simple as `document.querySelector('input[name="panel:assForm:trainee:green:evalValue"][type="hidden"]').value = 2`