# AMPOWER

Powered by Ambibuzz



# Main features

### Product Traceability:

- Viewing Stock Entry, Purchase Invoice, Purchase Receipt, Sales Invoice and Delivery Notes details associated with a batch number.
- Report of Stock Entry, Purchase Invoice, Purchase Receipt, Sales Invoice and Delivery Notes associated with a batch number



# How to Install

1. `bench get-app ampower https://github.com/ambibuzz/ampower.git`

2. `bench --site [your.site.name] install-app ampower`

3. `bench build`

4. `bench restart`



# Setup and Use:

## Product Traceability:

In Erpnext

1. Go to → Page List -> Product Traceability Page -> Go to Product Traceability Page

   ![Screenshot from 2022-08-03 17-40-46](https://user-images.githubusercontent.com/88362758/182604543-afa1487e-2b86-4fb1-941a-60355f32781e.png)

2. On Product Traceability Page

   1. Enter an item code in item field and
   
   ![Screenshot from 2022-07-26 12-57-57](https://user-images.githubusercontent.com/88362758/180952155-ccb950ad-eb19-4098-8075-a9a02c11b1d9.png)
   
   2. Choose one item from the autosuggestion

   ![Screenshot from 2022-08-03 18-00-17](https://user-images.githubusercontent.com/88362758/182608133-aa756685-8c81-4dce-a5e9-722276f5cce0.png)
   
   3. Press `Fetch Batch No` button
   
   ![Screenshot from 2022-07-26 12-58-37](https://user-images.githubusercontent.com/88362758/182795812-03a54287-3217-4b26-ae6d-e219d05c2efb.png)
   
   4. Choose one batch no from `Select Batch No` appear below
   
   ![Screenshot from 2022-07-26 12-58-10](https://user-images.githubusercontent.com/88362758/180953716-55e550a5-26b2-4095-ac77-fbe508649da9.png)
   
   5. Two buttons `View Page` and `View Report` will appear below.

3. Press `View Page` button, a detailed view of the batch no will appear right sides of the input fields like below
  
    1. Press `+` icon of each sections to expand the page with detailed view of that section
    
    ![Screenshot from 2022-07-26 12-58-31](https://user-images.githubusercontent.com/88362758/180955174-69e02237-9849-42df-a58d-79a6f3abed4d.png)
    
    2. Right click on Document Name and choose `Go to the link` to open that document in a new tab

   ![Screenshot from 2022-08-03 18-13-39](https://user-images.githubusercontent.com/88362758/182612188-3f95c8c9-331a-450a-9fd0-75497b1d584d.png)
   
    4. Again `+` icon of each sections to collapse that section

4. Press `View Report` button, it will redirect to Product Traceability Report with selected `batch no` prefilled.

    ![Screenshot from 2022-08-04 13-19-36](https://user-images.githubusercontent.com/88362758/182795619-bf6cea98-8baf-4970-9f5d-9c0b0c492eb8.png)

    1. Right click on Document Name and choose `Go to the link` to open that document in a new tab

   ![Screenshot from 2022-08-03 18-14-53](https://user-images.githubusercontent.com/88362758/182612313-94c8cb2b-c4ef-49e4-b45b-54065a5ba71f.png)
    





## Dependencies

1. [Frappe](https://github.com/frappe/frappe) Version 13+
2. [ERPNext](https://github.com/frappe/erpnext) Version 13+
3. Python Version  3+


