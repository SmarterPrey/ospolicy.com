[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://github.com/codespaces/new?hide_repo_select=true&ref=main&repo=568248659)

https://github.com/ppottorff/ospolicy.com/actions/workflows/deploycdk.yml/badge.svg

### OSPpolicy.com

This project contains a web application built in CDK, Dev in Containers, Pipelines in GHA, REACT...  

### Things I want to do:
1. Add React App for creating documentation plans, using them for a compliance project.
1. Implement the comments code so any page on the site has ability to take comments.
1. Add a WAF, make the out of the box "sec" ideal.
1. Add signed Cookies, httponly and secure.
1. Add Cognito based auth against pools of AAD, Cognito, Anonmyous, possibly GitHub.


### Useful CDK Build Commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template
