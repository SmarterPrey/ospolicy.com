[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://github.com/codespaces/new?hide_repo_select=true&ref=main&repo=568248659)

[![CodeGuru Security Assessment](https://github.com/SmarterPrey/ospolicy.com/actions/workflows/main.yml/badge.svg)](https://github.com/SmarterPrey/ospolicy.com/actions/workflows/main.yml)

![AWS Deploy](https://github.com/ppottorff/ospolicy.com/actions/workflows/deploycdk.yml/badge.svg)


### OS Policy Website

This project contains a web application built in CDK, Dev in Containers, Pipelines in GHA, REACT... for testing

### Things I want to do next:
1. Add React App for creating documentation plans, using them for a compliance project.
1. Implement the comments code so any page on the site has ability to take comments.
1. Add a WAF, make the out of the box "sec" ideal.
1. Add signed Cookies, httponly and secure.
1. Add Cognito based auth against pools of AAD, Cognito, Anonmyous, possibly GitHub.

### The Broader Concept

In the world of compliance is this need to track what is in scope for compliance requirements. Programs like PCI require a business to comply with hundreds of specific rules. There are activities that must be performed daily, monthly, quarterly, semi-annually, and annually. Many rules are out of scope aka don't apply to a specific organization. Year over year a lot of this remains static. However, for the requirements in scope a business needs to collect evidence to prove it. These may be spreadsheets showing the users disabled who don't access a system in 90 days. It could be a report on scanning for insecure wireless access points. There are hundreds of these points on which to track and keep evidence. A subset of groups of requirements may be assigned to network teams, security teams, operational teams, business managers, call center managers, etc...

The idea is as follows:
1. Create a "plan" for a compliance regime. This is a template that specifies the set of raw requirements that a business needs to report on. We might create a plan for PCI V3, another for PCI v4. There could be other plans, like a checklist for apps that a business releases. 
1. Customers use the plan to create an instance of evidence for a given year or release. The instance may be titled something like "2022 PCI Compliance." Each requirement would allow for a text field where the assigned person can describe what is done to comply, evidence that shows it. It could also be used to document why the business doesn't comply and how that is being fixed. Besides the text description, there would be a radio button for needs update, comply, doesn't comply, or not applicable. Each requirement would allow for any number of files to be uploaded and attached to show compliance.
1. Key to productivity, the system will track periodic activities and automatically remind the assigned persons to review and update evidence. The system will keep history of that compliance evidence. For example, PCI requires critical/high vuln patching in 30 days. At the end of the year there would be 12 attached files showing vulnerability reports for the year. 
1. There's potential to integrate with O365/Teams. Companies don't want sensitive files like this on someone elses system. This system could be designed to save the files in a Teams team (sharepoint file repository), link to it from the web app. It could be designed to place calendar entries. It could be designed to use teams messaging or e-mail to send notice, remind. It could use organization information to escalate to a manager if the assigned person doesn't act.
1. In a new year the system would be designed to clone from last year. Some evidence may not change. Some files like security policies may be linked to 30+ requirements. People don't want to reassign the evidence, reassign people, etc... They may only want to make small revisions to the one security plan. 
1. Other potential exists for automation to be triggered in the system. PCI requires segregation testing, ASV scanning, etc... This system could potentially trigger those tools, update and report results on its own.

### Commercial Viability

CoalFire maintained a tool for customers for a long time. It was built in Sharepoint, was useful. They discontinued this, moved their customers to a solution called VigiOne. VigiOne is ok. However, it makes everything VERY difficult. It is poorly designed, not designed by people who need to quickly get things done. For example, if you update a security policy you must upload a new file then remove it from the 30 locations the old file is located, reattach it to all 30 requirements again. They don't do year over year updates. You start from scratch. There's no tracking of assignment, scheduling activities, or reminding... It is 500/MO for one company I know that uses it with two people on contract to maintain evidence, do the annual audits. People costs are 100,000/yr to maintain the compliance program, evidence. 

I would believe this kind of application is both easy to build, easy to sell. Its very fundamental ability to track and manage information like this is similar to Enterprise GRC tools like Archer. Systems like Archer, however, are complex. They like to create pre-canned obnoxious red tape checklists and security/GRC compliance guides. Most competent security teams simply want to track, review, and update information like this. They don't want all of the other crap. Why is it easy to build? 

1. Basic web app. No need for mobile, etc... before it is viable.
1. Creating a plan/template is a 1-n thing. If you figure it out to work for 2 then it it works for 2,000,000. Once a plan for PCI V4, for example is created then it can be used by any customer that needs to do it. There would be "canned plans" mapping to known compliance regimes. It could support a customer creating a "custom plan" that is only visible to them.
1. Cloning plan/template is also easy plan/template -> instance year 1 -> instance year 2. The only complexity is if the original plan updates, for example when moving from a 3.2 plan to a 4.0 plan. In this instance, when you update the plan you remove, add, or change requirements. Remove is easy. It is just gone. If it changes or a new one added then you just set it to its "Needs Update status." 
1. These things are easy to sell. One can get lists of companies from business marketing firms, send them mail, etc... One could be listed on things like the PCI vendor list, go to trade shows, etc... Businesses are pretty ok with spending sums of 500/mo for a product on subscription, particularly if they can reduce the number of people they need to hire, make them a lot more productive, or make the tracking of compliance easier.

### Useful CDK Build Commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template
