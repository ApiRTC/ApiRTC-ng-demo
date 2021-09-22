# apirtc-ng-demo

This project aims to demonstrate most ApiRTC javascript api features.

A running version shall be available on the associated github page : https://apirtc.github.io/ApiRTC-ng-demo

## Get dependencies

Run `npm install`

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).

## Run with ssl to let getUserMedia work

ng serve --host 0.0.0.0 --ssl

## Deploy to 'docs' (for github pages deployment)

ng build --configuration production --output-path docs --base-href /ApiRTC-ng-demo/

cp docs/index.html docs/404.html

git add docs/*

git status

git commit -a -m "deploy"

git push origin main