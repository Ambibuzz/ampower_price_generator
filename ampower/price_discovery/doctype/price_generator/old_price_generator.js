var item_table = []

frappe.ui.form.on('Price Generator', {
    onload: function (frm, cdt, cdn) {
        console.log("DEBUGGER")
        frm.set_query("fg_item", function () {
            return {
                "filters": {
                    "is_sales_item": "1"
                }
            }
        })
    },
    fg_item: function (frm, cdt, cdn) {
        get_uom(frm, cdt, cdn)
    },
    extract_item: function (frm, cdt, cdn) {
        var doc = frappe.get_doc(cdt, cdn)

        item_table = []

        collect_items(frm, cdt, cdn)
        // sleep(3000)
        setTimeout(() => {
            console.log(item_table)
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
    fg_item_uom: function (frm, cdt, cdn) {
        check_uom(frm, cdt, cdn)
    }
})

function calculate(frm, cdt, cdn) {
    var doc = frappe.get_doc(cdt, cdn)

    var bom_item = doc.bom_item
    var _bom_price = 0.0;
    var _total_price = 0.0;

    // This was used to seperate items in bom_item table according to different bom extracted using uom added

// *****************************************************************************************************************
    // var uom_list = []
    // var bom_wise_item = []

    // for (var i = 0; i < doc.bom_table.length; i++) {
    //     uom_list.push(doc.bom_table[i]["item_uom"])
    // }

    // for (var i = 0; i < uom_list.length; i++) {
    //     bom_wise_item[uom_list[i]] = []
    // }

    // for (var i = 0; i < bom_item.length; i++) {
    //     for (var j = 0; j < uom_list.length; j++) {
    //         if (uom_list[j] == bom_item[i]["uom"]) {
    //             bom_wise_item[uom_list[j]].push(bom_item[i])
    //         }
    //     }
    // }

    // var bom_item = doc.bom_item
    // var additional_item = doc.additional_item

    // var bom_price = {}
    // var _bom_price = 0.0
    // for (var keys in bom_wise_item) {
    //     bom_price[keys] = null
    //     for (var i = 0; i < bom_wise_item[keys].length; i++) {
    //         _bom_price = _bom_price + bom_wise_item[keys][i]["total"]
    //     }
    //     bom_price[keys] = _bom_price
    // }
// *****************************************************************************************************************

    for (var i = 0; i < bom_item.length; i++) {
        _bom_price = _bom_price + bom_item[i]["pd_rate"]
    }

    // if (doc.additional_item) {
    //     for (var j = 0; i < additional_item.length; j++) {
    //         _bom_price = _bom_price + additional_item[j]["total"]
    //     }
    // }

    // _total_price = _bom_price * ((doc.markup_)/100);

    _total_price = _bom_price;

    frappe.model.set_value(cdt, cdn, "total_price", _total_price);

    frm.set_value("unit_price", (_total_price / doc.fg_item_quantity));

    if (doc.markup_) {
        var markup_ = _total_price + ((doc.markup_) / 100 * _total_price);
        frm.set_value("total_markup_price", markup_);
    }
    else {
        frappe.msgprint("Please add Markup %")
    }
}

function quotation_creation(frm, cdt, cdn) {
    var doc = frappe.get_doc(cdt, cdn)
    var qty = doc.fg_item_quantity

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
                'item_code': doc.fg_item,
                'qty': qty,
                'uom': doc.fg_item_uom,
                'rate': doc.unit_price
            },
        ]
    }).then(function (doc) {
        frappe.show_alert(`${doc.doctype} ${doc.name} created!`);
        frm.save()
    });
}

function check_uom(frm, cdt, cdn) {
    var doc = frappe.get_doc(cdt, cdn)
    var uom_list = []
    if (doc.fg_item) {
        frappe.db.get_doc('Item', doc.fg_item).then(
            result => {
                if (result["uoms"].length != 0) {
                    result["uoms"].map(d => {
                        if (d.uom == cur_frm.doc.fg_item_uom) {
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

function get_uom(frm, cdt, cdn) {
    var doc = frappe.get_doc(cdt, cdn)
    frappe.db.get_doc('Item', doc.fg_item).then(
        result => {
            if (result["uoms"].length != 0) {
                frappe.model.set_value(cdt, cdn, "fg_item_uom", (result["stock_uom"]))
                frappe.model.set_value(cdt, cdn, "conversion_factor", (result["uoms"][0]["conversion_factor"]))
            }
            else {
                var msg = "UOM missing with " + doc.fg_item + "<br><br>Conversion Factor SET to 1"
                frappe.msgprint(msg)
                frappe.model.set_value(cdt, cdn, "conversion_factor", 1)
            }
        })

    if (doc.uom && doc.uom.length > 0) {
        frm.clear_table("uom")
    }
    
    var valid_uom = ""

    frappe.db.get_list('UOM Conversion Detail', {
        filters: { 'parent': doc.fg_item },
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
            
            frm.fields_dict['additional_item'].grid.get_field("uom").get_query = function(doc, cdt, cdn) {
                return {
                    filters: [["UOM", "uom_name", "in", valid_uom]]
                }
            }
        }
    })
}

function collect_items(frm, cdt, cdn) {
    var doc = frappe.get_doc(cdt, cdn)

    for (var i = 0; i < doc.bom_table.length; i++) {
        frappe.db.get_doc('BOM', doc.bom_table[i]["bom"]).then(
            data => {
                if (!data || data.length <= 0) {
                    return;
                }

                for (var k = 0; k < data["exploded_items"].length; k++) {
                    doc.bom_table.map(m => {
                        if (m.bom == data["exploded_items"][k]["parent"]) {
                            data["exploded_items"][k]["uom"] = m.item_uom
                        }
                    })

                    item_table.push(data["exploded_items"][k])
                }

                var msg = "BOM " + data["exploded_items"][k - 1]["parent"] + " Fetched"
                frappe.show_alert(msg)
            }
        )
    }
}

function populate_item(frm, cdt, cdn) {
    var doc = frappe.get_doc(cdt, cdn)
    var qty_to_produce = doc.fg_item_quantity
    var table = {}

    for (var i = 0; i < item_table.length; i++) {
        var item_uom = item_table[i].uom
        var conversion_factor;

// this code was picking wrong conversion factor
        // doc.uom.map(m => {
        //     if (item_uom == m.uom) {
        //         conversion_factor = m.conversion_factor
        //     }
        // })

        doc.uom.map(m => {
            if (m.uom == doc.fg_item_uom) {
                conversion_factor = m.conversion_factor
            }
        })

        table = {
            "item": item_table[i].item_code,
            "item_name": item_table[i].item_name,
            "item_quantity": (item_table[i].qty_consumed_per_unit) * qty_to_produce,
            "qty_consumed_per_unit": item_table[i].qty_consumed_per_unit,
            "item_rate": item_table[i].rate,
            "total": ((item_table[i].qty_consumed_per_unit) * qty_to_produce) * item_table[i].rate,
            "uom": item_table[i].uom,
            "pd_quantity": item_table[i].qty_consumed_per_unit * conversion_factor,
            "pd_rate": (item_table[i].qty_consumed_per_unit * conversion_factor) * item_table[i].rate * qty_to_produce
        };
        frm.add_child("bom_item", table)
        refresh_field("bom_item")
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

frappe.ui.form.on('Additional Item', {
    item: function (frm, cdt, cdn) {
        var doc = frappe.get_doc(cdt, cdn)
        if (doc.item) {
            frappe.db.get_doc('Item', doc.item).then(
                result => {
                    frappe.model.set_value(cdt, cdn, "item", result["item_name"]);
                    frappe.model.set_value(cdt, cdn, "item_rate", result["valuation_rate"]);
                }
            )
        }
    },
    item_quantity: function (frm, cdt, cdn) {
        var doc = frappe.get_doc(cdt, cdn)
        if (!doc.item) {
            frappe.msgprint("Please Select an Item first")
            frappe.model.set_value(cdt, cdn, "item_quantity", 0);
        }
        else {
            var total = doc.item_rate * doc.item_quantity
            frappe.model.set_value(cdt, cdn, "total", total);
        }
    }
})

frappe.ui.form.on('BOM List', {
    bom: function (frm, cdt, cdn) {
        var doc = frappe.get_doc(cdt, cdn)
        frappe.db.get_doc('BOM', doc.bom).then(
            result => {
                frappe.model.set_value(cdt, cdn, "item_uom", result.uom);
                frappe.model.set_value(cdt, cdn, "quantity", result.quantity);
            })
    },
    item_uom: function (frm, cdt, cdn) {
        var doc = frappe.get_doc(cdt, cdn)
        if (!doc.bom) {
            return
        }
        var uom_found;
        var uom_list = cur_frm.doc.uom
        uom_list.map(m => {
            if (doc.item_uom == m.uom) {
                uom_found = m.uom
            }
        })
        if (doc.item_uom != uom_found) {
            var msg = "BOM " + String(doc.bom) + " has no Conversion for Item : " + String(cur_frm.doc.fg_item)
            frappe.msgprint(msg)
            frappe.model.set_value(cdt, cdn, "bom", "");
            cur_frm.get_field("bom_table").grid.grid_rows[doc.idx - 1].remove();
        }
    }
})

// ******************************************************************
// ******************************************************************
//  DATE: 8-10-2022
// ******************************************************************
// ******************************************************************



// Copyright (c) 2022, n ithead@ambibuzz.com and contributors
// For license information, please see license.txt

// global variable for collecting exploded_item from BOM 
var item_table = []

frappe.ui.form.on('Price Generator', {
    onload: function (frm, cdt, cdn) {
        console.log("DEBUGGER")
        // filter to get only finished good item
        frm.set_query("fg_item", function () {
            return {
                "filters": {
                    "is_sales_item": "1"
                }
            }
        })
    },
    fg_item: function (frm, cdt, cdn) {
        get_uom(frm, cdt, cdn)
    },
    extract_item: function (frm, cdt, cdn) {
        var doc = frappe.get_doc(cdt, cdn)

        frm.clear_table("bom_item");
        frm.refresh_field("bom_item");
        item_table = []
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
    fg_item_uom: function (frm, cdt, cdn) {
        check_uom(frm, cdt, cdn)
    }
})

// to calculate per_unit price and total_price for all item in bom_item
function calculate(frm, cdt, cdn) {
    var doc = frappe.get_doc(cdt, cdn)

    var bom_item = doc.bom_item
    var _bom_price = 0.0;
    var _total_price = 0.0;

    // adding all items in bom_item 
    for (var i = 0; i < bom_item.length; i++) {
        _total_price = _total_price + bom_item[i]["total"]
    }

    // if (doc.additional_item) {
    //     for (var j = 0; i < additional_item.length; j++) {
    //         _bom_price = _bom_price + additional_item[j]["total"]
    //     }
    // }

    frappe.model.set_value(cdt, cdn, "total_price", _total_price);

    // per unit price by didvinding total_price by quantity to produce
    frm.set_value("unit_price", (_total_price / doc.fg_item_quantity));

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
    var qty = doc.fg_item_quantity

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
                'item_code': doc.fg_item,
                'qty': qty,
                'uom': doc.fg_item_uom,
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
    if (doc.fg_item) {
        frappe.db.get_doc('Item', doc.fg_item).then(
            result => {
                if (result["uoms"].length != 0) {
                    result["uoms"].map(d => {
                        if (d.uom == cur_frm.doc.fg_item_uom) {
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
    frappe.db.get_doc('Item', doc.fg_item).then(
        result => {
            if (result["uoms"].length != 0) {
                frappe.model.set_value(cdt, cdn, "fg_item_uom", (result["stock_uom"]))
                frappe.model.set_value(cdt, cdn, "conversion_factor", (result["uoms"][0]["conversion_factor"]))
            }
            else {
                var msg = "UOM missing with " + doc.fg_item + "<br><br>Conversion Factor SET to 1"
                frappe.msgprint(msg)
                frappe.model.set_value(cdt, cdn, "conversion_factor", 1)
            }
        })

    if (doc.uom && doc.uom.length > 0) {
        frm.clear_table("uom")
    }

    var valid_uom = ""

    frappe.db.get_list('UOM Conversion Detail', {
        filters: { 'parent': doc.fg_item },
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
            frm.fields_dict['additional_item'].grid.get_field("uom").get_query = function(doc, cdt, cdn) {
                return {
                    filters: [["UOM", "uom_name", "in", valid_uom]]
                }
            }
        }
    })
}

// get exploded_item from every BOM in BOM table 
// and add to global variable item_table
function collect_items(frm, cdt, cdn) {
    var doc = frappe.get_doc(cdt, cdn)

    for (var i = 0; i < doc.bom_table.length; i++) {
        frappe.db.get_doc('BOM', doc.bom_table[i]["bom"]).then(
            data => {
                if (!data || data.length <= 0) {
                    return;
                }

                for (var k = 0; k < data["exploded_items"].length; k++) {
                    // adding BOM's UOM for further calculation requirement
                    doc.bom_table.map(m => {
                        if (m.bom == data["exploded_items"][k]["parent"]) {
                            data["exploded_items"][k]["uom"] = m.item_uom
                        }
                    })
                    item_table.push(data["exploded_items"][k])
                }

                var msg = "BOM " + data["exploded_items"][k - 1]["parent"] + " Fetched"
                frappe.show_alert(msg)
            }
        )
    }
}

// use data within global variable item_table and 
// populate bom_item table with conversion calculation 
function populate_item(frm, cdt, cdn) {
    var doc = frappe.get_doc(cdt, cdn)
    var qty_to_produce = doc.fg_item_quantity
    var table = {}

    for (var i = 0; i < item_table.length; i++) {
        var conversion_factor;

        // get conversion_factor after mapping Price Discovery's selected UOM
        // and uom comming from Item Master 
        doc.uom.map(m => {
            if (m.uom == doc.fg_item_uom) {
                conversion_factor = m.conversion_factor
            }
        })

        // preparing entry for bom_item table
        table = {
            "item": item_table[i].item_code,
            "item_name": item_table[i].item_name,
            "item_quantity": item_table[i].qty_consumed_per_unit * conversion_factor * qty_to_produce,
            "qty_consumed_per_unit": item_table[i].qty_consumed_per_unit,
            "item_rate": item_table[i].rate,
            "uom": item_table[i].uom,
            // pd_quantity is per unit for UOM selected in Price Discovery
            "pd_quantity": item_table[i].qty_consumed_per_unit * conversion_factor,
            // pd_rate is price per unit for UOM selected in Price Discovery
            "pd_rate": (item_table[i].qty_consumed_per_unit * conversion_factor) * item_table[i].rate,
            // total is pd_rate multiply by qty_to_produce
            "total": (item_table[i].qty_consumed_per_unit * conversion_factor) * item_table[i].rate * qty_to_produce
        };
        frm.add_child("bom_item", table)
        refresh_field("bom_item")
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

frappe.ui.form.on('Additional Item', {
    item: function (frm, cdt, cdn) {
        var doc = frappe.get_doc(cdt, cdn)
        if (doc.item) {
            frappe.db.get_doc('Item', doc.item).then(
                result => {
                    frappe.model.set_value(cdt, cdn, "item_rate", result["valuation_rate"]);
                }
            )
        }
    },
    item_quantity: function (frm, cdt, cdn) {
        var doc = frappe.get_doc(cdt, cdn)
        if (!doc.item) {
            frappe.msgprint("Please Select an Item first")
            frappe.model.set_value(cdt, cdn, "item_quantity", 0);
        }
        else {
            var total = doc.item_rate * doc.item_quantity
            frappe.model.set_value(cdt, cdn, "total", total);
        }
    },
    uom: function (frm, cdt, cdn) {
        var doc = frappe.get_doc(cdt, cdn)
        var conversion_factor = 0;

        // get conversion_factor after mapping Price Discovery's selected UOM
        // and uom comming from Item Master 
        cur_frm.doc.uom.map(m => {
            if (m.uom == doc.uom) {
                conversion_factor = m.conversion_factor
            }
        })

        if (conversion_factor == 0) {
            var msg = "Additional Item " + String(doc.item_name) + " has no Conversion with Item : " + String(cur_frm.doc.fg_item)
            frappe.msgprint(msg)
            cur_frm.get_field("additional_item").grid.grid_rows[doc.idx - 1].remove();
        }
    }
})

frappe.ui.form.on('BOM List', {
    bom: function (frm, cdt, cdn) {
        var doc = frappe.get_doc(cdt, cdn)
        frappe.db.get_doc('BOM', doc.bom).then(
            result => {
                frappe.model.set_value(cdt, cdn, "item_uom", result.uom);
                frappe.model.set_value(cdt, cdn, "quantity", result.quantity);
            })
    },
    item_uom: function (frm, cdt, cdn) {
        var doc = frappe.get_doc(cdt, cdn)
        if (!doc.bom) {
            return
        }
        var uom_found;
        var uom_list = cur_frm.doc.uom
        uom_list.map(m => {
            if (doc.item_uom == m.uom) {
                uom_found = m.uom
            }
        })
        if (doc.item_uom != uom_found) {
            var msg = "BOM " + String(doc.bom) + " has no Conversion for Item : " + String(cur_frm.doc.fg_item)
            frappe.msgprint(msg)
            // frappe.model.set_value(cdt, cdn, "bom", "");
            cur_frm.get_field("bom_table").grid.grid_rows[doc.idx - 1].remove();
        }
    }
})