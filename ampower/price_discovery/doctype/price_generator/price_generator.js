// Copyright (c) 2022, n ithead@ambibuzz.com and contributors
// For license information, please see license.txt

// global variable for collecting exploded_item from BOM 
var item_table = []

frappe.ui.form.on('Price Generator', {
    onload: function (frm, cdt, cdn) {
        console.log("DEBUGGER")
    },
    item: function (frm, cdt, cdn) { //current doctype (cdt) current document name (cdn)
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
    },
    default_bom: function (frm, cdt, cdn) {
        get_default_bom(frm, cdt, cdn)
    }
})

// to get the default bom
function get_default_bom(frm, cdt, cdn) {
    var doc = frappe.get_doc(cdt, cdn)
    frappe.call('ampower.price_discovery.doctype.price_generator.price_generator.get_default_bom', { doc: doc })
        .then(res => {
            if ("message" in res) {
                if ('name' in res['message']) {
                    var table = {
                        "bom": res['message']['name']
                    }
                    cur_frm.add_child("pg_bom_list", table)
                    refresh_field("pg_bom_list")
                }
            }
            else {
                frappe.msgprint("Defalut BOM not available");
            }
        })
}

// to calculate per_unit price and total_price for all item in pg_bom_item
function calculate(frm, cdt, cdn) {
    frm.save()
    var doc = frappe.get_doc(cdt, cdn)
    var pg_bom_item = doc.pg_bom_item
    var additional_item = doc.additional_item
    var _total_price = 0.0;

    // adding all items in pg_bom_item 
    for (var i = 0; i < pg_bom_item.length; i++) {
        _total_price = _total_price + pg_bom_item[i]["total_rate"]
    }

    if (doc.additional_item) {
        for (var j = 0; j < additional_item.length; j++) {
            _total_price = _total_price + additional_item[j]["total_rate"]
        }
    }

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
    frappe.call('ampower.price_discovery.doctype.price_generator.price_generator.quotation_creation', { doc: doc , qty: qty})
    .then(function () {
        frappe.show_alert(`${doc.name} quotation created!`);
        frm.save()
    });
}

// to check if BOM selected in BOM tabel has a valid conversion with 
// finished good selected in Price Discovery
function check_uom(frm, cdt, cdn) {
    var doc = frappe.get_doc(cdt, cdn)
    var uom_list = []
    if (doc.item) {
        frappe.call('ampower.price_discovery.doctype.price_generator.price_generator.check_uom', { docType: 'Item' , doc : doc})
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
            }
        })
    if (doc.uom && doc.uom.length > 0) {
        frm.clear_table("uom")
    }
    // add filters for addition_item uom selection
    var valid_uom = ""
    frappe.call('ampower.price_discovery.doctype.price_generator.price_generator.get_uom_conversion_detail', {doc: doc}).then(result => {
        if (result.message !== undefined) {
            result = result.message
            for (var i = 0; i < result.length; i++) {
                frm.add_child("uom", {
                    "uom": result[i]["uom"],
                    "conversion_factor": result[i]["conversion_factor"]
                })
                refresh_field("uom")
                valid_uom = valid_uom + (result[i]["uom"]).toString() + ","
            }
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
    console.log(doc);
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
            "total_rate": (item_table[i].qty_consumed_per_unit * conversion_factor) * item_table[i].rate * qty_to_produce
        };
        frm.add_child("pg_bom_item", table)
        refresh_field("pg_bom_item")
    }
}

function recalculate_prices(frm, cdt, cdn) {
    frm.save()
    var doc = frappe.get_doc(cdt, cdn)

    var bom_item = frm.doc.pg_bom_item
    var qty_to_produce = doc.item_quantity

    for (var i = 0; i < bom_item.length; i++) {

        var cdt = bom_item[i]["doctype"]
        var cdn = bom_item[i]["name"]
        var total_rate = bom_item[i]["rate"] * bom_item[i]["qty"]
        frappe.model.set_value(cdt, cdn, "total_rate", total_rate);
    }
    var msg = "Total Rate recalculated"
    frappe.msgprint(msg)
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
        console.log(doc.item_code);
        if (doc.item_code) {
            frappe.db.get_doc('Item', doc.item_code).then(
                result => {
                    console.log("result");
                    console.log(result);
                    console.log('Price Generator Additional Item start');
                    frappe.model.set_value(cdt, cdn, "uom", result["stock_uom"]);
                    console.log('Price Generator Additional Item end');
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
})

frappe.ui.form.on('Price Generator BOM List', {
    bom: function (frm, cdt, cdn) {
        var doc = frappe.get_doc(cdt, cdn)
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