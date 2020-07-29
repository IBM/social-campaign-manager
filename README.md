![version](https://img.shields.io/badge/version-1.0.0-blue) [![Build Status](https://travis.ibm.com/innovation-exchange/Social-Campaign-Manager.svg?token=q4myqACn6bmhGqDgFWpH&branch=master)](https://travis.ibm.com/innovation-exchange/Social-Campaign-Manager) ![node-version](https://img.shields.io/badge/node-8.11.3-green)


![Social Campaign Manager](docs/social-campaign-manager.jpg)

# IBM Social Campaign Manager

This source code is the output of an experiment to see how we can capture the voice of the public and colleagues using AI and automation tools. This release of the IBM Social Campaign Manager is an end-to-end prototype application intended to demonstrate the art of the possible using different cloud services to create and deploy AI-enabled engagement and analysis. We hope this will inspire new ways of thinking with regards to how information is surveyed and gathered and give others something to build from.

Read the documentation provided in the [docs](./docs) folder. The documentation describes the use case, systems architecture, available APIs and the usage demo.

Created by the IBM Ireland Innovation Exchange.

# Deployment instructions

This readme will describe how to set up required services on IBM Cloud and push the application from your local machine to host it on IBM Cloud as a Cloud Foundry app - [CF Documentation](https://cloud.ibm.com/docs/cloud-foundry-public?topic=cloud-foundry-public-getting-started)

It will mention concepts like `Environment Variables` which you’ll need to configure using: the `.env` file ([documentation](https://www.npmjs.com/package/dotenv)) (example file [.env.sample] provided in the root folder of the repository) and in the `manifest.yml` file (example file [manifest.yml.sample] provided in the root folder of the repository).

The manifest file is used to push application to IBM Cloud.
More on cloud foundry manifest here: [Documentation](https://docs.cloudfoundry.org/devguide/deploy-apps/manifest.html)

## Application runtime
* NodeJS back-end API server
* Angular front-end application

## System requirements:
* You will need the correct `NodeJS version v8.11.x` installed on your device. [NodeJS Distributions](https://nodejs.org/dist/latest-v8.x/)
* Running the Social Campaign Manager requires an account on IBM Cloud.
You can set one up for free here: https://cloud.ibm.com/
* Install the **ibmcloud cli** tool which can be found here: https://www.ibm.com/cloud/cli

### Before you start

Clone the repository to your local machine.
```
$ git clone git@github.com:IBM/social-campaign-manager.git
```

Inside of the cloned git directory on your local machine refer to two files:
* .env.sample
* manifest.yml.sample

The above files hold the application **Environment Variables** configuration. They will be used to build the application locally and push the it to IBM Cloud. The files will be explained in further detail in context below. For now make a copy of the `.env` file by running:

```
$ cp .env.sample .env
```

And then make a copy of the `manifest.yml` file.

```
$ cp manifest.yml.sample manifest.yml
```

You can open the new `.env` file and `manifest.yml` files to place tokens inside.

## Generate encryption keys

Depending on the database used there may be existing volume or data level encryption applied out of the box. Additionally an example encryption technique has been implemented that could be used for application level encryption.  The data is encrypted using encryption keys which need to be recreated before the application's first run. The type of encryption implemented will depend on your requirements.

`Temporary solution:` The encryption crypto module needs at least Node version v10+ to run. Use NVM to temporarily upgrade the Node.js version to v10 and then return to 8.11.x in further steps.

 ```
 $ node scripts/generate-encryption-keys.js

 ```

# IBM Cloud pre-requisites:

You will use four services from our IBM Cloud Cloud Foundry catalogue:
- Watson Assistant
- Watson Natural Language Understanding (NLU)
- Cloudant Database
- Compose for REDIS

You can set up each IBM service through http://cloud.ibm.com/catalog/ or go to your ibm cloud dashboard and press the `Create resource+` button in the top right corner.

Here you can select the tier of the application. Most of the services on IBM Cloud have a free tier which means you won't get charged for using them until you hit the usage threshold.

At the bottom of the screen you'll find configuration forms for your resource. Under service name you'll be able to give each service a meaning name like `scm-watson-assistant` for the assistant or `scm-cloudant` for the cloudant database.

Instructions on how to deploy and configure each can be found below.

## Configuring Watson Assistant

The service responses for the user's conversation. More on Watson Assistant here: https://cloud.ibm.com/docs/assistant

Once all the services are up you will need to configure the Watson Assistant service. Go to your assistant service and click the `Launch Watson Assistant` button. Open Watson Assistant and click on the menu on the left hand side to navigate to the Skills section.
Watson automatically adds a sample assistant and skill to your new instance. You can **delete the skill now** (you will first have to remove it from the assistant) and **add a new skill called `WORKSPACE_PICKER`**. Make it a **Dialog Skill** and leave the defaults as they are.

This is very important, as without it the application won't be able to start.

Each social media campaign will be a Watson Assistant skill just like this one. The **Workspace Picker** is a special skill used in the SCM application to find other campaigns. It assigns each campaign with its own `#Intent` in the workspace picker and uses it to decide which campaign to use. It can also be used to answer some simple answers before selecting campaigns. You can easily expand its functionality by adding in new intents or dialog nodes through the Watson Assistant UI. For now though, all we need is for this skill to exist and be named `WORKSPACE_PICKER`.

## Configuring Watson Natural Language Understanding (NLU)

The service responsible for analysing the participants' responses, providing semantic analysis of the gathered responses. More on Watson NLU here: https://cloud.ibm.com/docs/natural-language-understanding

## Configuring Cloudant Database

An IBM NoSQL database to store the participants' responses\
In the cloudant config in **Available authentication methods** select:\
`Use both legacy credentials and IAM`.

The application will create the necessary cloudant collections databases on first start.

## Configuring Compose for REDIS

To handle conversation context in direct chat messages. Each conversation will use a redis document stored in memory valid for 48 hours. During this time the user is able to continue the conversation. Once this time lapses, the context is deleted. You'll find it under **Compare Versions** in Databases for REDIS in the IBM Cloud catalogue.

The application does not currently support TLS authentication.
Set **TLS Enabled** as `False`. Leave the rest of the configuration as default.

## Use Twitter as the direct messaging input (experimental / optional)
The application is able to use Twitter as its Social Media input and can tweet out an invitation to the social media campaign created by the creator.

To do this you will need to first set up a Developer account on Twitter: https://developer.twitter.com/en/apply-for-access

Then create an app in https://developer.twitter.com/en/apps

As the Social Campaign Manager application uses Direct Messaging you will need both the *CONSUMER_API_KEY* and *CONSUMER_API_SECRET_KEY* as well as the *ACCESS_TOKEN* and its respective *ACCESS_TOKEN_SECRET*. These can be put in your `.env` file and in the Cloud Foundry `manifest.yml` file in the env section. These will be explained below.


# Build the application front-end

### Configure your .env file to build the application

Example `.env` file

```PowerShell
NODE_ENV=dev

TWITTER_CONSUMER_KEY=YOUR-TWITTER-CONSUMER-KEY
TWITTER_CONSUMER_SECRET=YOUR-TWITTER-CONSUMER-SECRET
TWITTER_ACCESS_TOKEN_KEY=YOUR-TWITTER-ACCESS-TOKEN-KEY
TWITTER_ACCESS_TOKEN_SECRET=YOUR-TWITTER-ACCESS-TOKEN-SECRET
TWITTER_USER_ID=YOUR-TWITTER-USER-ID
```


### Install nodejs dependencies before building

```bash
$ npm install
```

Build front-end angular application. In your Terminal run:

```bash
$ npm run build
```

Running the `npm run build` command builds the front-end angular application into the `dist/` folder.

**Note:**
There might be some security warnings while building the application. This is due to the application using an older version of NodeJS (v8). As of March 2020 the current LTS version of Node is v12.

## Deploying to IBM Cloud

Once the front end is built you can deploy the application to IBM Cloud.

To bind the newly created services you will need to push the app to IBM Cloud. To do this you can push the local git repository directly to IBM Cloud and bind the services once uploaded.
The services we created will need to bind to your Cloud Foundry app through service aliases. This means they will have an alias under the Cloud Foundry Services with a link to your newly created service.

For simplicity, we will assume you will push your application directly from your own machine. To do this we will use the sample `./manifest.yml` file.

### Update your local manifest file

Update your manifest file with the required tokens.

Sample `manifest.yml` file:
```yaml
applications:
- path: .
  memory: 1024M
  instances: 1
  name: YOUR-APPLICATION-NAME
  routes:
    - route: YOUR-APPLICATION-NAME.eu-gb.mybluemix.net
  disk_quota: 1024M
  buildpack: sdk-for-nodejs
  env:
    NODE_ENV: dev
    TWITTER_CONSUMER_KEY: YOUR-TWITTER-CONSUMER-KEY
    TWITTER_CONSUMER_SECRET: YOUR-TWITTER-CONSUMER-SECRET
    TWITTER_ACCESS_TOKEN_KEY: YOUR-TWITTER-ACCESS-TOKEN-KEY
    TWITTER_ACCESS_TOKEN_SECRET: YOUR-TWITTER-ACCESS-TOKEN-SECRET
    TWITTER_USER_ID: YOUR-TWITTER-USER-ID
```


In the terminal app browse to your local app repository:

Login to the IBM Cloud
```bash
$ ibmcloud login
```

Set up your Cloud Foundry endpoints
```bash
$ ibmcloud target --cf
```

*You can also use the non-interactive endpoint setup*:
ibmcloud target --cf-api https://api.eu-de.cf.cloud.ibm.com -o your_org -s your_space

`WARNING`\
This next step will push the application to IBM Cloud but fail to start the application. This is expected behaviour as we need to bind the application to the services first.

In the root directory of the app run the command below to push your application:
```bash
$ ibmcloud cf push -f path/to/manifest.yml
```

## Binding IBM cloud foundry services to the application

Once the application is pushed bind each service (watson assistant, watson nlu, cloudant, redis) with your application.

To do that visit:
https://cloud.ibm.com/resources

In the `Services` list section in the newly created **Watson Assistant** service go to **Connections** in the menu on the left hand side.

Press the `Create connection +` button.

Find your application in the correct **Region**, **Cloud Foundry Org** and **Space** and press `Connect`.

Generate the service key with default settings and when asked to create a cloud foundry alias, agree to the form.

In `Access Role for Connection` leave the default setting as **Manager**.
All the other fields are optional.

Connect Service into Space.

This will generate a Cloud Foundry instance, or alias, of this service with the same name, which will appear in the dashboard for this space.

There is no need to restage the application until the last service is connected. Restaging the app will restart the application. The application will only start when all services are bound to it.

Repeat for Watson NLU and Cloudant.

### Compose for REDIS

As Compose for REDIS is already created as a Cloud Foundry service and not listed in the Services list. You will need to bind the service from the other end by going to your Cloud Foundry App's Connections section.

On the Resource list go to the Cloud Foundry Apps click you application name.

Go to `Connections` in the menu on the left hand side.

Press `Create connection +`

Find the Compose for REDIS service from the list and press `Connect`.

You should now **restage** your application.

## Visit your application

When the last service is connected you can now restage the application. Restaging  the app should start the application. You can now browse to the application through your url configured in the `manifest.yml` file, e.g. http://YOUR-APPLICATION-NAME.eu-gb.mybluemix.net/

You can now proceed to create a campaign. You can see how to do this in the [Usage Demo](./docs/usage-demo.md) in the documentation.

## Subscribing app to chat with Twitter Direct Messages

The Twitter API needs to subscribe your Twitter Application to the url your application is running on. This way Twitter does not keep a live a connection but rather uses webhooks to post updates to a publicly available server. You can use the development tool in `dev/twitter-tunnel.js` file to subscribe your Twitter app to your server's url. Read more about it in the [Twitter documentation](https://developer.twitter.com).

In ./dev/twitter-tunnel.js file you will need to set up two configuration variables.

TWITTER_APP_ENVIRONMENT - this is the environment you configured your twitter application to be in.
CLOUD_BASE_URL - the IBM Cloud hostname from the manifest.yml file

Set up your configuration and subscribe to the application by running:

```bash
$ node dev/twitter-tunnel.js
```

## Run locally

The application is also capable of running locally on localhost. It will typically run the server on ports starting from 6001 (http://localhost:YOUR_PORT_NUMBER/). Build it using the build command and then start.

```bash
$ npm run build
$ npm start
```

 The app can run the script in `/dev/twitter-tunnel.js` to set up an ngrok tunnel directly to local running nodejs application port through an externally available https:// url. This way Twitter is able to subscribe the application to a publicly available webhook url and interact with the application as if it was stored on a public host server. Remember to run the application first, then run the script to subscribe the Twitter app to your ngrok url!


### Operating system disclaimer
The Social Campaign Manager application has been developed and tested on MacOS Catalina and deployed as an Cloud Foundry app instance on IBM Cloud. The app has not been tested on the Microsoft Windows operating system. Some scripts updates might be necessary to enable running of the app on Windows.

## Acknowledgements

This project received funding as part of the MiDAS project under the EC Horizon 2020 SC1-PMF-18 Big Data Supporting Public Health Policies.

Grant Agreement No. 727721

## License & Authors

If you would like to see the detailed LICENSE click [here](LICENSE).

### Authors:
- Peter Poliwoda <peterpoliwoda@ie.ibm.com>
- Gordon Doyle <doylego@ie.ibm.com>
- Simon McLoughlin
- Jason Lloyd
- Ryan Gallagher
- Kieran Flynn
- Brian Maguire
- Aidan Butler
- Jason Flood


```text
Copyright:: 2020- IBM, Inc

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.


=================================================
Creative Commons License
=================================================

This distribution uses the following components which are licensed under a Creative Commons License (https://creativecommons.org/licenses/)

font-awesome (4.7.0) licensed under CC BY 4.0 + MIT-equivalent + OFL 1.1  https://github.com/FortAwesome/Font-Awesome
License available at https://creativecommons.org/licenses/by/4.0/

spdx-exceptions (2.3.0) licensed under CC-BY-3.0  https://github.com/kemitchell/spdx-exceptions.json
License available at https://creativecommons.org/licenses/by/3.0/

caniuse-db (1.0.30001054) licensed under CC-BY-4.0  https://github.com/Fyrd/caniuse
License available at https://github.com/ben-eb/caniuse-lite/blob/master/LICENSE

caniuse-lite (1.0.30001054) licensed under CC-BY-4.0  https://github.com/ben-eb/caniuse-lite
License available at https://creativecommons.org/licenses/by/4.0/

spdx-license-ids	(3.0.5) licensed under	CC0-1.0	 https://github.com/shinnn/spdx-license-ids
License available at https://creativecommons.org/publicdomain/zero/1.0/deed


=================================================
Apache 2.0 License
=================================================

This distribution uses the following components which are licensed under an Apache 2.0 License (https://opensource.org/licenses/Apache-2.0)

spdx-correct (3.1.0) - Licensed under Apache-2.0 available at https://github.com/jslicense/spdx-correct.js/blob/master/LICENSE
typescript (3.0.3) - Licensed under Apache-2.0 available at https://github.com/Microsoft/TypeScript/blob/master/LICENSE.txt
validate-npm-package-license (3.0.4). Licensed under Apache-2.0 available at https://github.com/kemitchell/validate-npm-package-license.js/blob/master/LICENSE


=================================================
MIT License
=================================================

This distribution bundles the following components which are available under an MIT License (https://opensource.org/licenses/MIT).

Angular Starter - https://github.com/PatrickJS/starter/ - distributed under the MIT license [available here](https://github.com/PatrickJS/starter/blob/master/LICENSE).

The distribution also uses the following components under the MIT license:

posix-character-classes	0.1.1 licensed under MIT https://github.com/jonschlinkert/posix-character-classes
https://github.com/jonschlinkert/posix-character-classes/blob/master/LICENSE

postcss-reduce-initial 1.0.1 licensed under MIT  https://github.com/cssnano/cssnano
License available at https://github.com/cssnano/cssnano/blob/master/LICENSE-MIT


```
