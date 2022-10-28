// Copyright (c) 2022, n ithead@ambibuzz.com and contributors
// For license information, please see license.txt

// global variable for collecting exploded_item from BOM 
var item_table = []

frappe.ui.form.on('Price Generator', {
    onload: function (frm, cdt, cdn) {
        console.log("DEBUGGER")
        // filter to get only finished good item
        // frm.set_query("item", function () {
        //     return {
        //         "filters": {
        //             "is_sales_item": "1"
        //         }
        //     }
        // })
    },
    item: function (frm, cdt, cdn) {
        get_uom(frm, cdt, cdn)
    },
    extract_item: function (frm, cdt, cdn) {
        var doc = frappe.get_doc(cdt, cdn)

        frm.clear_table("pg_bom_item");
        frm.refresh_field("pg_bom_item");
        item_table = []

        if (doc.item_quantity <= 0) {
            frappe.msgprint("Please add quantity to be produced in Item Qunatity")
            return;
        }


        collect_items(frm, cdt, cdn)

        // getting item from BOM takes time so added timeout/sleep
        // sleep(3000)
        setTimeout(() => {
            populate_item(frm, cdt, cdn)
        }, 4000)
    },
    customer: function (frm, cdt, cdn) {
        // No Customer/Lead, no Quotation.
        var doc = frappe.get_doc(cdt, cdn)
        if (!doc.customer) {
            frappe.show_alert("Cannot create quotation without Customer or Lead!")
            return;
        }
    },
    create_quotation: function (frm, cdt, cdn) {
        quotation_creation(frm, cdt, cdn)
    },
    calculate: function (frm, cdt, cdn) {
        calculate(frm, cdt, cdn)
    },
    item_uom: function (frm, cdt, cdn) {
        check_uom(frm, cdt, cdn)
    },
    calculate_total: function (frm, cdt, cdn) {
        calculate_total(frm, cdt, cdn);
    },
    recalculate_prices: function (frm, cdt, cdn) {
        recalculate_prices(frm, cdt, cdn)
    }
})

// to calculate per_unit price and total_price for all item in pg_bom_item
function calculate(frm, cdt, cdn) {
    frm.save()
    var doc = frappe.get_doc(cdt, cdn)

    var pg_bom_item = doc.pg_bom_item
    var _bom_price = 0.0;
    var _total_price = 0.0;

    // adding all items in pg_bom_item 
    for (var i = 0; i < pg_bom_item.length; i++) {
        _total_price = _total_price + pg_bom_item[i]["total_rate"]
    }

    // if (doc.additional_item) {
    //     for (var j = 0; i < additional_item.length; j++) {
    //         _bom_price = _bom_price + additional_item[j]["total"]
    //     }
    // }

    frappe.model.set_value(cdt, cdn, "total_price", _total_price);

    // per unit price by didvinding total_price by quantity to produce
    frm.set_value("unit_price", (_total_price / doc.item_quantity));

    if (doc.markup_) {
        var markup_ = _total_price + ((doc.markup_) / 100 * _total_price);
        frm.set_value("total_markup_price", markup_);
    }
    else {
        frappe.msgprint("Please add Markup %")
    }
}

// to create quotation
function quotation_creation(frm, cdt, cdn) {
    var doc = frappe.get_doc(cdt, cdn)
    var qty = doc.item_quantity

    if (!doc.unit_price || !doc.markup_ || !doc.total_markup_price) {
        frappe.msgprint("Please Press Calculate")
        return;
    }

    frappe.db.insert({
        doctype: 'Quotation',
        quotation_to: "Customer",
        party_name: doc.customer_name,
        customer_name: doc.customer_name,
        company: frappe.user_defaults.company,
        order_type: 'Sales',
        items: [
            {
                'item_code': doc.item,
                'qty': qty,
                'uom': doc.item_uom,
                'rate': doc.unit_price
            },
        ]
    }).then(function (doc) {
        frappe.show_alert(`${doc.doctype} ${doc.name} created!`);
        frm.save()
    });
}

// to check if BOM selected in BOM tabel has a valid conversion with 
// finished good selected in Price Discovery
function check_uom(frm, cdt, cdn) {
    var doc = frappe.get_doc(cdt, cdn)
    var uom_list = []
    if (doc.item) {
        frappe.db.get_doc('Item', doc.item).then(
            result => {
                if (result["uoms"].length != 0) {
                    result["uoms"].map(d => {
                        if (d.uom == cur_frm.doc.item_uom) {
                            uom_list = d
                        }
                    })
                    if (uom_list.length == 0) {
                        var msg = "UOM not matched for any Conversion "
                        frappe.msgprint(msg)
                    }
                }
            }
        )
    }
}

// to get the all UOM Conversion from Item Master and 
// SET filter for Addition Item UOM
function get_uom(frm, cdt, cdn) {
    var doc = frappe.get_doc(cdt, cdn)
    frappe.db.get_doc('Item', doc.item).then(
        result => {
            if (result["uoms"].length != 0) {
                frappe.model.set_value(cdt, cdn, "item_uom", (result["stock_uom"]))
                // frappe.model.set_value(cdt, cdn, "conversion_factor", (result["uoms"][0]["conversion_factor"]))
            }
            // else {
            //     var msg = "UOM missing with " + doc.item + "<br><br>Conversion Factor SET to 1"
            //     frappe.msgprint(msg)
            //     frappe.model.set_value(cdt, cdn, "conversion_factor", 1)
            // }
        })

    if (doc.uom && doc.uom.length > 0) {
        frm.clear_table("uom")
    }


    // to add filters for to addition_item uom selection
    var valid_uom = ""
    frappe.db.get_list('UOM Conversion Detail', {
        filters: { 'parent': doc.item },
        fields: ["*"]
    }).then(result => {
        if (result.length > 0) {
            var table = {}
            for (var i = 0; i < result.length; i++) {
                table = {
                    "uom": result[i]["uom"],
                    "conversion_factor": result[i]["conversion_factor"]
                }
                frm.add_child("uom", table)
                refresh_field("uom")
                valid_uom = valid_uom + (result[i]["uom"]).toString() + ","
            }

            // setting filter for additional_item uom selection
            // frm.fields_dict['additional_item'].grid.get_field("uom").get_query = function(doc, cdt, cdn) {
            //     return {
            //         filters: [["UOM", "uom_name", "in", valid_uom]]
            //     }
            // }
        }
    })
}

// get exploded_item from every BOM in BOM table 
// and add to global variable item_table
function collect_items(frm, cdt, cdn) {
    var doc = frappe.get_doc(cdt, cdn)

    if (!doc.pg_bom_list || doc.pg_bom_list.length <= 0) {
        frappe.msgprint("Please add BOM to Price Generator BOM List")
        return
    }

    for (var i = 0; i < doc.pg_bom_list.length; i++) {
        // get BOM data from bom entered in BOM List one by one
        frappe.db.get_doc('BOM', doc.pg_bom_list[i]["bom"]).then(
            data => {
                // if no bom is entered in BOM List
                if (!data || data.length <= 0) {
                    return;
                }

                for (var k = 0; k < data["exploded_items"].length; k++) {
                    // adding BOM's UOM to data for further calculation requirement
                    doc.pg_bom_list.map(m => {
                        if (m.bom == data["exploded_items"][k]["parent"]) {
                            data["exploded_items"][k]["uom"] = m.uom
                        }
                    })
                    item_table.push(data["exploded_items"][k])
                }

                var msg = "Fetching BOM " + data["exploded_items"][k - 1]["parent"]
                frappe.show_alert(msg)
            }
        )
    }
}

// use data within global variable item_table and 
// populate pg_bom_item table with conversion calculation 
function populate_item(frm, cdt, cdn) {
    var doc = frappe.get_doc(cdt, cdn)
    var qty_to_produce = doc.item_quantity
    var table = {}

    for (var i = 0; i < item_table.length; i++) {
        var conversion_factor;

        // get conversion_factor after mapping Price Discovery's selected UOM
        // and uom comming from Item Master 
        doc.uom.map(m => {
            if (m.uom == doc.item_uom) {
                conversion_factor = m.conversion_factor
            }
        })

        // preparing entry for pg_bom_item table
        table = {
            "item_code": item_table[i].item_code,
            "item_name": item_table[i].item_name,
            "qty": item_table[i].qty_consumed_per_unit * conversion_factor * qty_to_produce,
            "qty_consumed_per_unit": item_table[i].qty_consumed_per_unit,
            "rate": (item_table[i].qty_consumed_per_unit * conversion_factor) * item_table[i].rate,
            "uom": item_table[i].uom,
            // pg_quantity is per unit for UOM selected in Price Discovery
            // "pg_quantity": item_table[i].qty_consumed_per_unit * conversion_factor,
            // pg_rate is price per unit for UOM selected in Price Discovery
            // "pg_rate": (item_table[i].qty_consumed_per_unit * conversion_factor) * item_table[i].rate,
            // total_rate is pd_rate multiply by qty_to_produce
            "total_rate": (item_table[i].qty_consumed_per_unit * conversion_factor) * item_table[i].rate * qty_to_produce
        };
        frm.add_child("pg_bom_item", table)
        refresh_field("pg_bom_item")
    }
}

function recalculate_prices(frm, cdt, cdn) {
    var doc = frappe.get_doc(cdt, cdn)

    var bom_item = frm.doc.pg_bom_item
    var qty_to_produce = doc.item_quantity

    for (var i = 0; i < bom_item.length; i++) {
        var conversion_factor;

        doc.uom.map(m => {
            if (m.uom == doc.item_uom) {
                conversion_factor = m.conversion_factor
            }
        })

        var cdt = bom_item[i]["doctype"]
        var cdn = bom_item[i]["name"]
        var idx = bom_item[i]["idx"]

        var total_rate = (bom_item[i].qty_consumed_per_unit * conversion_factor) * bom_item[i]["rate"] * qty_to_produce

        if (bom_item[i]["total_rate"] != total_rate) {
            frappe.model.set_value(cdt, cdn, "total_rate", total_rate);

            var msg = "Total Rate Update for Item Code : " + bom_item[i]["item_code"].toString() + " at Row No: " + bom_item[i]["idx"].toString()
            frappe.msgprint(msg)
        }
    }

}

function sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
        currentDate = Date.now();
    } while (currentDate - date < milliseconds);
}

function countObjectKeys(obj) {
    return Object.keys(obj).length;
}

function calculate_total(frm, cdt, cdn) {
    var additional_item = frm.doc.additional_item
    for (var i = 0; i < additional_item.length; i++) {
        // row by row
        var cdt = additional_item[i]["doctype"]
        var cdn = additional_item[i]["name"]
        var qty = additional_item[i]["qty"]
        var rate = additional_item[i]["rate"]
        if ((!qty || !rate) || (qty < 0 || rate < 0)) {
            var msg = "Please update value into qty and rate with greater than 0 at Row No: " + additional_item[i]["idx"].toString()
            frappe.msgprint(msg)
            continue;
        }
        var total_rate = qty * rate
        frappe.model.set_value(cdt, cdn, "total_rate", total_rate);
    }
}

frappe.ui.form.on('Price Generator Additional Item', {
    item_code: function (frm, cdt, cdn) {
        var doc = frappe.get_doc(cdt, cdn)
        if (doc.item_code) {
            frappe.db.get_doc('Item', doc.item_code).then(
                result => {
                    frappe.model.set_value(cdt, cdn, "uom", result["stock_uom"]);
                }
            )
        }
    },
    qty: function (frm, cdt, cdn) {
        var doc = frappe.get_doc(cdt, cdn)
        if (!doc.item_code) {
            frappe.msgprint("Please Select an Item first")
            frappe.model.set_value(cdt, cdn, "qty", 0);
        }
        // else {
        //     var total = doc.rate * doc.qty
        //     frappe.model.set_value(cdt, cdn, "total_rate", total);
        // }
    },
    rate: function (frm, cdt, cdn) {
        var doc = frappe.get_doc(cdt, cdn)
        if (!doc.item_code) {
            frappe.msgprint("Please Select an Item first")
            frappe.model.set_value(cdt, cdn, "rate", 0);
        }

        if (!doc.qty) {
            frappe.msgprint("Please add Qty for the Item first")
            frappe.model.set_value(cdt, cdn, "rate", 0);
        }
    }
    // uom: function (frm, cdt, cdn) {
    //     var doc = frappe.get_doc(cdt, cdn)
    //     var conversion_factor = 0;

    //     // get conversion_factor after mapping Price Discovery's selected UOM
    //     // and uom comming from Item Master 
    //     cur_frm.doc.uom.map(m => {
    //         if (m.uom == doc.uom) {
    //             conversion_factor = m.conversion_factor
    //         }
    //     })

    //     if (conversion_factor == 0) {
    //         var msg = "Additional Item " + String(doc.item_name) + " has no Conversion with Item : " + String(cur_frm.doc.item)
    //         frappe.msgprint(msg)
    //         cur_frm.get_field("additional_item").grid.grid_rows[doc.idx - 1].remove();
    //     }
    // }
})

frappe.ui.form.on('Price Generator BOM List', {
    bom: function (frm, cdt, cdn) {
        var doc = frappe.get_doc(cdt, cdn)
        frappe.db.get_doc('BOM', doc.bom).then(
            result => {
                frappe.model.set_value(cdt, cdn, "uom", result.uom);
                frappe.model.set_value(cdt, cdn, "qty", result.quantity);
            })
    },
    uom: function (frm, cdt, cdn) {
        var doc = frappe.get_doc(cdt, cdn)
        if (!doc.bom) {
            return
        }
        var uom_found;
        // get list of UOM from Item UOM Table
        var uom_list = cur_frm.doc.uom

        // to match the uom of BOM and uom of Finished Good
        uom_list.map(m => {
            if (doc.item_uom == m.uom) {
                uom_found = m.uom
            }
        })

        // no match in uom found between Finished Good and BOM
        if (doc.item_uom != uom_found) {
            var msg = "BOM " + String(doc.bom) + " has no Conversion for Item : " + String(cur_frm.doc.item)
            frappe.msgprint(msg)

            // clear the entered entry inside BOM List due to no match found
            cur_frm.get_field("pg_bom_list").grid.grid_rows[doc.idx - 1].remove();
        }
    }
})