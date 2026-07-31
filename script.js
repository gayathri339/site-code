import { createClient } from 
"https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";


// =============================
// SUPABASE CONFIG
// =============================

const SUPABASE_URL = "https://huqkayiunltctqdktxfv.supabase.coL";

const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1cWtheWl1bmx0Y3RxZGt0eGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MTA1NTAsImV4cCI6MjEwMTA4NjU1MH0.zw8FVm8pMxGypXmgzFJ2-nfPoRXe899r62kXVMuNiXU";


const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);



// =============================
// ENCRYPTION FUNCTIONS
// =============================


async function deriveKey(password, salt){


    const encoder = new TextEncoder();


    const keyMaterial =
        await crypto.subtle.importKey(

            "raw",

            encoder.encode(password),

            "PBKDF2",

            false,

            ["deriveKey"]

        );



    return crypto.subtle.deriveKey(

        {

            name:"PBKDF2",

            salt:salt,

            iterations:100000,

            hash:"SHA-256"

        },


        keyMaterial,


        {

            name:"AES-GCM",

            length:256

        },


        false,


        ["encrypt","decrypt"]

    );

}




async function encryptFile(file,password){


    const data =
        await file.arrayBuffer();



    const salt =
        crypto.getRandomValues(
            new Uint8Array(16)
        );


    const iv =
        crypto.getRandomValues(
            new Uint8Array(12)
        );



    const key =
        await deriveKey(
            password,
            salt
        );



    const encrypted =
        await crypto.subtle.encrypt(

            {

                name:"AES-GCM",

                iv:iv

            },

            key,

            data

        );



    return {

        encrypted,

        salt,

        iv

    };


}





async function decryptFile(
    encrypted,
    password,
    salt,
    iv
){


    const key =
        await deriveKey(
            password,
            salt
        );



    return crypto.subtle.decrypt(

        {

            name:"AES-GCM",

            iv:iv

        },


        key,


        encrypted

    );

}





// =============================
// UPLOAD
// =============================


document
.getElementById("uploadBtn")
.onclick = async ()=>{


const file =
document.getElementById("pdfFile").files[0];


const password =
document.getElementById("uploadPassword").value;



if(!file){

alert("Select PDF");

return;

}



if(file.type !== "application/pdf"){

alert("Only PDF allowed");

return;

}



if(file.size > 10*1024*1024){

alert("Maximum size is 10MB");

return;

}



document
.getElementById("uploadStatus")
.innerHTML="Encrypting...";



const {

encrypted,

salt,

iv

} =
await encryptFile(
    file,
    password
);



const shareId =
crypto.randomUUID()
.substring(0,8);



const fileName =
shareId+".enc";



// upload encrypted file

const upload =
await supabase.storage

.from("encrypted-files")

.upload(

fileName,

new Blob([encrypted])

);



if(upload.error){

console.log(upload.error);

return;

}





// save metadata

const {error} =
await supabase

.from("files")

.insert({

share_id:shareId,

filename:file.name,

file_path:fileName,

iv:
btoa(
String.fromCharCode(...iv)
),

salt:
btoa(
String.fromCharCode(...salt)
)

});



if(error){

console.log(error);

return;

}




document
.getElementById("shareId")
.value =
shareId;



document
.getElementById("uploadStatus")
.innerHTML =
"✅ Uploaded Successfully";


};






// =============================
// DOWNLOAD
// =============================


document
.getElementById("downloadBtn")
.onclick = async ()=>{


const shareId =
document
.getElementById("downloadId")
.value;


const password =
document
.getElementById("downloadPassword")
.value;



document
.getElementById("downloadStatus")
.innerHTML =
"Downloading...";




// get metadata

const {data,error} =
await supabase

.from("files")

.select("*")

.eq(
"share_id",
shareId
)

.single();



if(error){

alert("File not found");

return;

}




// download encrypted file


const response =
await supabase.storage

.from("encrypted-files")

.download(

data.file_path

);



const encryptedBuffer =
await response.data.arrayBuffer();




// convert salt and iv back


const salt =
Uint8Array.from(

atob(data.salt),

c=>c.charCodeAt(0)

);


const iv =
Uint8Array.from(

atob(data.iv),

c=>c.charCodeAt(0)

);





try{


const decrypted =
await decryptFile(

encryptedBuffer,

password,

salt,

iv

);




const blob =
new Blob(

[decrypted],

{

type:"application/pdf"

}

);



const url =
URL.createObjectURL(blob);



const a =
document.createElement("a");


a.href=url;


a.download =
data.filename;


a.click();



document
.getElementById("downloadStatus")
.innerHTML =
"✅ Downloaded";


}

catch(e){

alert(
"Wrong password"
);

}



};





// =============================
// COPY SHARE ID
// =============================


document
.getElementById("copyBtn")
.onclick=()=>{


navigator.clipboard.writeText(

document
.getElementById("shareId")
.value

);


alert(
"Share ID copied"
);


};
