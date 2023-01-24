# Copyright (c) 2022, n ithead@ambibuzz.com and contributors
# For license information, please see license.txt

import json
import frappe
from frappe.model.document import Document


class PriceGenerator(Document):
    pass


@frappe.whitelist()
def get_default_bom(doc):
    doc = json.loads(doc)
    bom_list = frappe.db.get_list('BOM',
                                  filters={
                                      "item": doc.get('item'),
                                      "is_active": "1",
                                      "is_default": "1"
                                  },
                                  fields=["name"]
                                  )
    if (len(bom_list) is not 0):
        return bom_list[0]
    return []


@frappe.whitelist()
def quotation_creation(doc, qty):
    doc = json.loads(doc)
    qty = int(qty)
    item = frappe.new_doc('Quotation')
    item.quotation_to = "Customer"
    item.party_name = doc.get('customer_name')
    item.customer_name = doc.get('customer_name')
    item.company = frappe.defaults.get_user_default('company')
    item.order_type = 'Sales'
    item.append("items", {
                'item_code': doc.get('item'),
                'qty': qty,
                'uom': doc.get('item_uom'),
                'rate': doc.get('total_markup_price') / qty
                })
    item.insert()


@frappe.whitelist()
def get_uom_conversion_detail(doc):
    doc = json.loads(doc)
    return frappe.db.get_list('UOM Conversion Detail',
                       filters={'parent': doc.get('item')},
                       fields=["*"]
                       )


@frappe.whitelist()
def check_uom(docType, doc):
    doc = json.loads(doc)
    result = frappe.get_doc(docType, doc.get('item'))
    if (len(result.get("uoms"))!= 0) :
        for d in result.get('uoms'):
            if (d.get('uom') == doc.get('item_uom')) :
                return result
            else:
                frappe.msgprint("UOM not matched for any Conversion")
             
# @frappe.whitelist()      
# def calculate():
#     var doc = frappe.get_doc(cdt, cdn)
#     var pg_bom_item = doc.pg_bom_item
#     var additional_item = doc.additional_item
#     var _total_price = 0.0;

#     // adding all items in pg_bom_item 
#     for (var i = 0; i < pg_bom_item.length; i++) {
#         _total_price = _total_price + pg_bom_item[i]["total_rate"]
#     }

#     if (doc.additional_item) {
#         for (var j = 0; j < additional_item.length; j++) {
#             _total_price = _total_price + additional_item[j]["total_rate"]
#         }
#     }

#     frappe.model.set_value(cdt, cdn, "total_price", _total_price);

#     // per unit price by didvinding total_price by quantity to produce
#     frm.set_value("unit_price", (_total_price / doc.item_quantity));

#     if (doc.markup_) {
#         var markup_ = _total_price + ((doc.markup_) / 100 * _total_price);
#         frm.set_value("total_markup_price", markup_);
#     }
#     else {
#         frappe.msgprint("Please add Markup %")
#     }