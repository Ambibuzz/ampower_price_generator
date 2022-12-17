# AmPower - Price Generator (Price Discovery)
AmPower Price Generator is a Frappe based Application which can help a business calculate a quotable price of a finished good based on other input raw material, without actually creating multiple BoMs.

### Version History
|Version No.| Description  |
|--|--|
|0.1| Initial release for external review. Multiple bugs and feature issues exists on this|

## Prerequisites
This application has been developed and verified on the following packages:
1. Frappe (v13.41.3)
2. ERPNext (v13.39.1)
3. BoM should be configured in ERPNext, else only some part of the Price Generator would work (see below)

It might work on other higher versions, but the functioning is not guaranteed.

## Business Case

Take a case of a Pharmaceutical company - one that is involved in manufacturing and supply of generic medicines. For a request for quotation received from a Customer, the Sales team has to create a configuration which involves the base medicine with any additional changes to salts, multiple levels of packaging starting from individual pills to multi-cartons. Further, there would be markup involved in either individual constituents of even as a bulk before a quotation can be finalized.

Consider another case of a food manufacturing and supply organization which deals in repackaging of spices. For any request for quotation received from a Customer (or lead), the sales team will have to select base constituent of any spice, plus any additional variation of any specific component based on taste required. Thereafter, packaging (poly, box, bottle) is additional configuration which goes into arriving at final per-unit (Kg/grams/packet) cost.

Similar issues in creating quotation can be observed for any organization which is in business of creating finished goods made of smaller constituents and one or more extra configurations based on Customer demand. Some of the hurdles the sales team would face can be summarized as:
 
- Allowing arbitrary items to be added to the final price, for example, extra packaging, or even higher quantity of a particular constituent. This essentially means creating more higher level BoM or duplicate BoM to change the prices. (BoM in ERPNext once submitted cannot be edited without cancelling or duplicating)
- Creating the finished good in a specific UoM but allowing other constituent items to be in another UoM.
- Adding markup on overall price OR on individual constituent items to arrive at final price.
- Playing around with this configuration or multiple such configuration for a comparative quote.

## Price Generator Application

*Price Generator and Price Discovery have been interchangeably used in this text as well as the code*

![High level view of the Price Generator Application](/doc/images/business_case.png)

### How to Install
[Refer this URL](https://frappeframework.com/docs/v14/user/en/basics/apps#installing-an-app-into-a-site)  for detailed instructions on how to install a third-party app on a Frappe Bench.
Short Instructions:

    $ bench get-app <URL> --branch <BRANCH>
  
 Where URL refers to this repository; Please use the `master` for closest stable release.

    $ bench --site <SITENAME> install-app ampower

Where `<SITENAME>` is the name of the site on which installation is to be done.
You can check the exact name of the App from the `frappe-bench/apps/` folder.
*Name of the Application can change over the course of development until a stable release is made.*

### How to Use

##### Step 0: Create a New Price Generator Form/Document

Create a new Price Generator Form which by searching for **Price Generator** in the search bar:

![Step 1 - Create a new Price Generator Document](/doc/images/shot1_pricegenerator.png)

##### Step 1,2,3: Select the Finished Good and fetch its Default BoM

In the field `Item`, complete list of items in the site's Item List would be visible. Here, an item has to be selected which is expected to be on the Quotation. Once this item is selected, its Name, Item Group and default UoM would be auto-fetched.
The UoM can be changed to reflect the Quotation UoM (packaging type). The Quantity field should be updated with quantity of the UoM selected for which Quotation has to be created.

![Step 2 - Select Finished Good Item and its UoM and Quantity](/doc/images/shot2_get_item_and_bom.png)

##### Step 4,5,6: Fetch and configure constituent BoMs

One can fetch the default BoM OR add any number of BoMs which can make up the final Item.
Here, care has to be taken that the BoM being selected **should** have the UoM which is available in the *Available UoM Conversion for Item* table which is fetched from the Item Document. That is important to map between two different UoM. For example, how many liters of a particular chemical form 1Kg of a powder once manufactured.
Once added, the Quantity of the BoM cannot be edited as these are from submitted BoM document and define a ratio of items (raw materials) required to create equivalent quantity. Though, in the next step the individual components can be modifed (for Rate and Quantity)

![Step 3 - Add additional constituent BoMS](/doc/images/shot3_bom_fetch_and_recalculate.png)

##### Step 7,8: Fetch Sub-assembly and configure individual constituent items

Fetch the sub-assemblies of the BoM selected in the table above. This would break all the BoMs into their individual items, their Rate and Quantities being fetched from BoM and adjusted for UoM Ratio.

![Step 4 - Fetch BoM Sub-assemblies and configure](/doc/images/shot4_calculate_totals.png)

##### Step 9: Create Quotation

Use the Markup field to define a markup which would generate the **Total Markup Price** of quantity as selected in Step 1.
Don't forget to click on "Calculate" once changes are done on the Markup %.
Select the Customer and create Quotation. Quotation would be created in the background and the name of the Quotation would be shown at the bottom right of the screen in a floating message.

![Step 5 - Create Quotation](/doc/images/shot5_create_quotation.png)

### Known Limitations
- In case the finished good and the BoM selected do not have a common UoM, the application cannot function as it cannot map between the quantity-UoM combination of item to Quote and the BoM.
- Layout of the form is not coherent and requires replacement of the buttons to create a workflow 
- Only Customers can be selected to create quotation; Leads cannot be selected.
- Price Generator always creates a new quotation and doesn't allow merging of a finished good into an existing quotation.

### Future
1. Janitorial Cleanup which includes standardized naming of the App, files and variables
2. Support for adding additional charges like Labour/Frieght directly in price generator and passing it on to Quotation document
3. Support for link to the quotation created directly from within Price Generator document.
4. Using Walkthrough like screens to allow for a step-by-step data entry and quotation creation
5. Restricting the number of items which are visible in the Item View, for example: only active, with default BoM etc
6. Allow for merging multiple Price Generator Finished Good (Item) into a single Quotation
