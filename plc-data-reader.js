const { Controller, Tag, EthernetIP } = require('ethernet-ip');
const { SINT, INT, DINT, REAL, BOOL } = EthernetIP.CIP.DataTypes.Types;
const net = require('net');

const csv = require('csv-parser');
const fs = require('fs');
const { networkInterfaces } = require('os');
const results = [];

const PLC = new Controller();
const DestinationPLC = new Controller();

function destroySourcePLC(){
    if(PLC){
        PLC.destroy();

        PLC.removeListener("error", onSourcePLCError);
        PLC.removeListener("end", onSourcePLCEnd);

        net.Socket.prototype.destroy.call(PLC);
        PLC = null;
    }
};

function destroyDestinationPLC(){
    if(DestinationPLC){
        DestinationPLC.destroy();

        DestinationPLC.removeListener("error", onDestinationPLCError);
        DestinationPLC.removeListener("end", onDestinationPLCEnd);

        net.Socket.prototype.destroy.call(DestinationPLC);
        DestinationPLC = null;
    }
};

function onSourcePLCError(err){
    let errStr = err instanceof Error ? err.toString() : JSON.stringify(err);
    console.log(errStr);
    onSourcePLCEnd();
};

function onSourcePLCEnd(){
    destroySourcePLC();
};


function onDestinationPLCError(err){
    let errStr = err instanceof Error ? err.toString() : JSON.stringify(err);
    console.log(errStr);
    onDestinationPLCEnd();
};

function onDestinationPLCEnd(){
    destroyDestinationPLC();
};

PLC.on("error", onSourcePLCError);
PLC.on("end", onSourcePLCEnd);

DestinationPLC.on("error", onDestinationPLCError);
DestinationPLC.on("end", onDestinationPLCEnd);

fs.createReadStream('TagsListFolder\\srvc_plc_tag_list.csv')
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
        results.forEach(v => {
            PLC.subscribe(new Tag(v.TagName));//,null,v.TagDataType));
            //DestinationPLC.subscribe(new Tag(v.TagName));
        });

        PLC.connect("10.10.10.5", 0).then(() => {
            console.log(PLC.properties); 
            PLC.scan_rate = 100;
            PLC.scan();
        });

        DestinationPLC.connect("10.10.10.100", 0).then(() => {
            console.log(DestinationPLC.properties);
            //DestinationPLC.scan_rate = 500;
            //DestinationPLC.scan();
        });

        PLC.forEach(tag => {
            tag.on("Initialized", async (tag) => {
                //console.log(`Initialized ${tag.value} - ${tag.type}`);
                 await addTagValues(tag);
				//console.log(DestinationPLC.properties);
            });

            tag.on("Changed",  async(tag, oldValue) => {
                //console.log("Changed", tag.value);
                //console.log(`${tag.name}:${tag.value}`);
                 await addTagValues(tag);
            });
        });

         async function addTagValues(tag){
					// var tagType = BOOL;
					// switch(tag.type){						
					// 	case "SINT":
					// 		tagType = SINT;
					// 		break;							
					// 	case "INT":
					// 		tagType = INT;
					// 		break;							
					// 	case "DINT":
					// 		tagType = DINT;
					// 		break;							
					// 	case "REAL":
					// 		tagType = REAL;
					// 		break;							
					// 	case "BOOL":
					// 		tagType = BOOL;
					// 		break;							
					// 	default:
					// 		break;
                    // }
                    
                    var tagType = EthernetIP.CIP.DataTypes.Types[tag.type] || null;					
					
					var destTag = new Tag(tag.name,null,tagType);
					//await DestinationPLC.readTag(destTag);
					 await DestinationPLC.writeTag(destTag, tag.value);
					
					console.log(`${destTag.name}:${destTag.value}`);
        
        };
    });
