"use strict";
const workshopEvent=Object.freeze({id:"2026-09-26-broadway-commons",name:"AI Business Lab",date:"September 26, 2026",fullDate:"Saturday, September 26, 2026",time:"1:00 PM–4:00 PM",venue:"Broadway Commons",room:"Room 403 Europe",city:"Salem, Oregon",address:"1300 Broadway St NE, Salem, OR 97301",price:50,capacity:10,registrationStatus:"production"});
const eventText={...workshopEvent,price:`$${workshopEvent.price}`,priceDetail:`$${workshopEvent.price} per attendee`,capacity:String(workshopEvent.capacity),capacityDetail:`Maximum ${workshopEvent.capacity} attendees`,venueRoom:`${workshopEvent.venue} · ${workshopEvent.room}`};
document.querySelector(".sandbox-label")?.remove();
document.querySelectorAll("[data-event]").forEach(element=>{const key=element.dataset.event;if(Object.hasOwn(eventText,key))element.textContent=eventText[key]});
const form=document.querySelector("#workshop-registration-form");
const checkoutButton=document.querySelector("#workshop-checkout-button");
const status=document.querySelector("#registration-status");
const message=document.querySelector("#registration-message");
const success=document.querySelector("#registration-success");
const availability=document.querySelector("#workshop-availability");
let card;let isSubmitting=false;let paymentComplete=false;let registrationClosed=false;let paymentAttempt;let paymentOutcomeUnknown=false;
function showError(text){message.textContent=text}
function setProcessing(processing){isSubmitting=processing;checkoutButton.disabled=processing||paymentComplete||registrationClosed||!card;checkoutButton.textContent=processing?"Processing…":paymentOutcomeUnknown?"Check payment status":"Pay $50.00"}
function showAvailability(result,{closeForm=true}={}){
  availability.textContent=result.soldOut?"Sold out":`${result.seatsRemaining} ${result.seatsRemaining===1?"seat":"seats"} remaining`;
  if(result.soldOut&&closeForm){
    registrationClosed=true;
    document.querySelector(".form-card").dataset.registrationState="sold-out";
    form.querySelectorAll("input, button").forEach(control=>{control.disabled=true});
    status.textContent="Registration is closed for this workshop.";
  }
}
async function refreshAvailability(options){
  const response=await fetch("/.netlify/functions/workshop-capacity",{headers:{Accept:"application/json"}});
  const result=await response.json();
  if(!response.ok||typeof result.seatsRemaining!=="number")throw new Error("AVAILABILITY_FAILED");
  showAvailability(result,options);return result;
}
async function initializeSquare(){
  try{
    const currentAvailability=await refreshAvailability();
    if(currentAvailability.soldOut)return;
    const response=await fetch("/.netlify/functions/workshop-payment-config",{headers:{Accept:"application/json"}});
    const config=await response.json();
    if(!response.ok||!config.applicationId||!config.locationId||!window.Square)throw new Error();
    const payments=window.Square.payments(config.applicationId,config.locationId);
    card=await payments.card();
    await card.attach("#square-payment-element");
    status.textContent="Secure payment powered by Square.";
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
      if(!paymentAttempt){
        const tokenResult=await card.tokenize();
        if(tokenResult.status!=="OK")throw new Error("TOKENIZATION_FAILED");
        paymentAttempt={sourceId:tokenResult.token,paymentAttemptId:crypto.randomUUID(),...attendee};
      }
      const response=await fetch("/.netlify/functions/create-workshop-payment",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(paymentAttempt)});
      const result=await response.json().catch(()=>({}));
      if(!response.ok||!result.success){
        if(response.status<500){paymentAttempt=undefined;paymentOutcomeUnknown=false}else{paymentOutcomeUnknown=true}
        if(result.code==="SOLD_OUT"){
          registrationClosed=true;showAvailability({soldOut:true,seatsRemaining:0});
        }
        throw new Error(result.message||"PAYMENT_FAILED");
      }
      paymentComplete=true;
      paymentOutcomeUnknown=false;
      form.querySelectorAll("input, button").forEach(control=>{control.disabled=true});
      form.hidden=true;status.hidden=true;
      document.querySelector("#success-attendee-name").textContent=paymentAttempt.name;
      const emailStatus=document.querySelector("#confirmation-email-status");
      emailStatus.textContent=result.emailStatus==="sent"
        ? `A confirmation email was sent to ${paymentAttempt.email}.`
        : result.emailStatus==="failed"
          ? "Your registration is confirmed, but the confirmation email could not be sent. Please keep your Square receipt."
          : "Your registration is confirmed. Email confirmation is not yet enabled.";
      if(result.receiptUrl){
        const receiptLink=document.querySelector("#square-receipt-link");
        receiptLink.href=result.receiptUrl;receiptLink.hidden=false;
      }
      if(result.storageStatus==="failed"){
        const storageStatus=document.querySelector("#registration-storage-status");
        storageStatus.textContent="Your payment is confirmed. Please keep your Square receipt while we reconcile the registration record.";
        storageStatus.hidden=false;
      }
      refreshAvailability({closeForm:false}).catch(()=>{});
      success.hidden=false;success.focus();
    }catch(error){
      if(paymentAttempt&&error instanceof TypeError)paymentOutcomeUnknown=true;
      const fallback=error.message==="TOKENIZATION_FAILED"?"Your card details could not be securely submitted. Please check them and try again.":paymentOutcomeUnknown?"We could not confirm the result. Your card may have been charged. Use “Check payment status” to safely retry the same payment attempt, or contact info@senorrosa.com.":"Payment was not completed. Please check your card and try again.";
      showError(!paymentOutcomeUnknown&&error.message&&!error.message.includes("_")?error.message:fallback);
    }finally{setProcessing(false)}
  });
  initializeSquare();
}
const year=document.querySelector("#current-year");if(year)year.textContent=new Date().getFullYear();
