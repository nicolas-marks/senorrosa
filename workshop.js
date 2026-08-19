"use strict";
const workshopEvent=Object.freeze({id:"2026-09-26-broadway-commons",name:"AI Business Lab",date:"September 26, 2026",fullDate:"Saturday, September 26, 2026",time:"1:00 PM–4:00 PM",venue:"Broadway Commons",room:"Room 403 Europe",city:"Salem, Oregon",address:"1300 Broadway St NE, Salem, OR 97301",price:50,capacity:10,registrationStatus:"sandbox"});
const eventText={...workshopEvent,price:`$${workshopEvent.price}`,priceDetail:`$${workshopEvent.price} per attendee`,capacity:String(workshopEvent.capacity),capacityDetail:`Maximum ${workshopEvent.capacity} attendees`,venueRoom:`${workshopEvent.venue} · ${workshopEvent.room}`};
document.querySelectorAll("[data-event]").forEach(element=>{const key=element.dataset.event;if(Object.hasOwn(eventText,key))element.textContent=eventText[key]});
const form=document.querySelector("#workshop-registration-form");
const checkoutButton=document.querySelector("#workshop-checkout-button");
const status=document.querySelector("#registration-status");
const message=document.querySelector("#registration-message");
const success=document.querySelector("#registration-success");
let card;let isSubmitting=false;let paymentComplete=false;
function showError(text){message.textContent=text}
function setProcessing(processing){isSubmitting=processing;checkoutButton.disabled=processing||paymentComplete||!card;checkoutButton.textContent=processing?"Processing…":"Pay $50.00"}
async function initializeSquare(){
  try{
    const response=await fetch("/.netlify/functions/workshop-payment-config",{headers:{Accept:"application/json"}});
    const config=await response.json();
    if(!response.ok||!config.applicationId||!config.locationId||!window.Square)throw new Error();
    const payments=window.Square.payments(config.applicationId,config.locationId);
    card=await payments.card();
    await card.attach("#square-payment-element");
    status.textContent="Secure Sandbox payment powered by Square.";
    checkoutButton.disabled=false;
    document.querySelector(".form-card").dataset.registrationState="ready";
  }catch{
    status.textContent="The secure payment form could not be loaded. Please refresh the page or try again later.";
    showError("Payment is temporarily unavailable.");
  }
}
if(form){
  form.addEventListener("submit",async event=>{
    event.preventDefault();
    if(isSubmitting||paymentComplete||!card)return;
    const attendee={name:form.elements.name.value.trim(),email:form.elements.email.value.trim(),businessName:form.elements.business_name.value.trim()};
    if(!attendee.name||!attendee.email||!form.elements.email.validity.valid){showError("Please enter your name and a valid email address.");return}
    showError("");setProcessing(true);
    try{
      const tokenResult=await card.tokenize();
      if(tokenResult.status!=="OK")throw new Error("TOKENIZATION_FAILED");
      const response=await fetch("/.netlify/functions/create-workshop-payment",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({sourceId:tokenResult.token,...attendee})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok||!result.success)throw new Error(result.message||"PAYMENT_FAILED");
      paymentComplete=true;
      form.querySelectorAll("input, button").forEach(control=>{control.disabled=true});
      form.hidden=true;status.hidden=true;
      document.querySelector("#success-attendee-name").textContent=attendee.name;
      success.hidden=false;success.focus();
    }catch(error){
      const fallback=error.message==="TOKENIZATION_FAILED"?"Your card details could not be securely submitted. Please check them and try again.":"Payment was not completed. Please check your card and try again.";
      showError(error.message&&!error.message.includes("_")?error.message:fallback);
    }finally{setProcessing(false)}
  });
  initializeSquare();
}
const year=document.querySelector("#current-year");if(year)year.textContent=new Date().getFullYear();
