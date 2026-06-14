# Free Spirit Experience - Master Database Schema

## Extracted Data Fields

| Field Name (camelCase) | UI Tab | Data Type | Priority | Description / Source Form |
| :--- | :--- | :--- | :--- | :--- |
| `firstName` | Profile/Demographics | string | Critical/Mandatory | Participant's first name. |
| `lastName` | Profile/Demographics | string | Critical/Mandatory | Participant's last name. |
| `dateOfBirth` | Profile/Demographics | date | Critical/Mandatory | Participant's date of birth. |
| `genderIdentity` | Profile/Demographics | string | Critical/Mandatory | Participant's gender/gender identity. |
| `passportNumber` | Profile/Demographics | string | Critical/Mandatory | Passport number for main insured/tourist. |
| `passportCountry` | Profile/Demographics | string | Critical/Mandatory | Country of passport issuance. |
| `citizenship` | Profile/Demographics | string | Critical/Mandatory | Participant's citizenship. |
| `dateOfEntry` | Logistics | date | Critical/Mandatory | Date of entry to Israel. |
| `purposeOfVisit` | Logistics | string | Critical/Mandatory | Purpose of visit (e.g., Gap Year Program). |
| `localAddress` | Profile/Demographics | object | Critical/Mandatory | Address in Israel (Street, House No., Apt, Town/City, Postal Code). |
| `homeAddress` | Profile/Demographics | string | Critical/Mandatory | Participant's full home address. |
| `mobilePhone` | Profile/Demographics | string | Critical/Mandatory | Participant's mobile/cell phone number. |
| `emailAddress` | Profile/Demographics | string | Critical/Mandatory | Participant's email address. |
| `cohabitants` | Profile/Demographics | string | Critical/Mandatory | Who else lives with the participant. |
| `dependents` | Profile/Demographics | array | Critical/Mandatory | Array of objects for Spouse/Children (Name, DOB, Passport, Gender). |
| `hostLastName` | Contacts | string | Critical/Mandatory | Last name of host in Israel. |
| `parentGuardianContacts` | Contacts | array | Critical/Mandatory | Array of objects (Name, Relationship, DOB, Phone, Email). |
| `insuranceAgentName` | Logistics | string | Critical/Mandatory | Name of the insurance agent. |
| `insuranceAgentNumber` | Logistics | string | Critical/Mandatory | ID/Number of the insurance agent. |
| `insurancePeriodStart` | Logistics | date | Critical/Mandatory | Requested start date for insurance. |
| `insurancePeriodEnd` | Logistics | date | Critical/Mandatory | Requested end date for insurance. |
| `programConsultant` | Logistics | string | Critical/Mandatory | Office use: Name of program consultant. |
| `programStartDate` | Logistics | date | Critical/Mandatory | Office use: Program start date. |
| `insuranceProvider` | Medical | string | Critical/Mandatory | Provider selection (Harel, Maccabi, Clalit). |
| `usesNarcoticsAlcohol` | Medical | boolean | Critical/Mandatory | Uses narcotics or drinks alcohol regularly. |
| `alcoholGlassesPerDay` | Medical | number | Critical/Mandatory | Quantity of daily alcohol consumption. |
| `pendingMedicalExams` | Medical | boolean | Critical/Mandatory | Pending exams/diagnoses (CT, MRI, biopsy, etc.) in last 5 years. |
| `tripForMedicalCare` | Medical | boolean | Critical/Mandatory | Is the trip purpose to receive medical care? |
| `pendingSurgery` | Medical | boolean | Critical/Mandatory | About to undergo surgery/transplant (with details). |
| `recentHospitalizations` | Medical | boolean | Critical/Mandatory | Hospitalized in the last 5 years (with details). |
| `regularMedications` | Medical | array | Critical/Mandatory | Array of objects (Name, Frequency, Dose, Route, Condition). |
| `knownAllergies` | Medical | array | Critical/Mandatory | Array of objects (Allergy, Reaction, Severity, Treatment). |
| `medicalConditionsChecklist` | Medical | array | Critical/Mandatory | Array of booleans for systemic diseases (Nervous, Heart, GI, etc.). |
| `medicalAirTransportRider` | Medical | boolean | Critical/Mandatory | Supplemental coverage for air transport. |
| `healthcareProviders` | Medical | array | Critical/Mandatory | Array of objects (Name/Specialty, Last Appt, Facility, Phone, Email). |
| `seasicknessMedsPref` | Medical | string | Critical/Mandatory | Preference for taking sea sickness medications. |
| `psychiatricHistory` | Medical | textarea | Critical/Mandatory | Current and previous psychiatric diagnoses. |
| `developmentalHistory` | Medical | object | Critical/Mandatory | Nested textareas (Pregnancy, Birth, Temperament, Milestones, Delays). |
| `vaccinationHistory` | Medical | array | Critical/Mandatory | Array of objects (Vaccine type, Received Y/N, Date). |
| `hospitalizationHistory` | Medical | array | Critical/Mandatory | Array of objects (Type, Date, Description of illness/injury). |
| `physicalHeight` | Medical | string | Critical/Mandatory | Physician filled: Height in ft/inches. |
| `physicalWeight` | Medical | number | Critical/Mandatory | Physician filled: Weight in lbs. |
| `physicalBloodPressure` | Medical | string | Critical/Mandatory | Physician filled: Blood pressure reading. |
| `physicalPulseRate` | Medical | number | Critical/Mandatory | Physician filled: Pulse rate. |
| `pulseIrregularities` | Medical | boolean | Critical/Mandatory | Physician filled: Presence of pulse irregularities. |
| `treatmentHistoryDetails` | Medical | textarea | Critical/Mandatory | General treatment history, diagnoses, therapy history. |
| `dietaryRestrictions` | Medical | textarea | Critical/Mandatory | Medical or elective dietary restrictions. |
| `physicalAccommodations` | Medical | textarea | Critical/Mandatory | Conditions affecting physical activities (hiking, swimming, etc.). |
| `generalAccommodations` | Medical | textarea | Critical/Mandatory | Other necessary accommodations for a safe environment. |
| `ccName` | Financial Aid | string | Critical/Mandatory | Credit card holder's name. |
| `ccIdNumber` | Financial Aid | string | Critical/Mandatory | Credit card holder's ID number. |
| `ccNumber` | Financial Aid | string | Critical/Mandatory | Credit card number. |
| `ccExpiration` | Financial Aid | string | Critical/Mandatory | Credit card valid until date. |
| `ccCvv` | Financial Aid | string | Critical/Mandatory | Credit card CVV number. |
| `paymentInstallments` | Financial Aid | number | Critical/Mandatory | Number of requested payment installments. |
| `talentsAndSkills` | Questionnaire | textarea | Critical/Mandatory | Participant's listed talents or skills. |
| `communityContribution` | Questionnaire | textarea | Critical/Mandatory | How the participant can contribute to the community. |
| `idealRoommate` | Questionnaire | textarea | Critical/Mandatory | Preferences for an ideal friend/roommate. |
| `favoriteFoods` | Questionnaire | textarea | Critical/Mandatory | Participant's favorite foods. |
| `desiredActivities` | Questionnaire | textarea | Critical/Mandatory | Special activities they want to try. |
| `programWorries` | Questionnaire | textarea | Critical/Mandatory | Things the participant is worried about. |
| `mainGoals` | Questionnaire | textarea | Critical/Mandatory | Main goals to achieve during the program. |
| `personalChallenge` | Questionnaire | textarea | Critical/Mandatory | Participant's greatest personal challenge. |
| `staffAssistance` | Questionnaire | textarea | Critical/Mandatory | How staff can help the participant move forward. |
| `mainStrengths` | Questionnaire | textarea | Critical/Mandatory | Strengths used to overcome past difficulties. |
| `passions` | Questionnaire | textarea | Critical/Mandatory | Hobbies, activities, or general passions. |
| `dreamJobs` | Questionnaire | textarea | Critical/Mandatory | Dream jobs/careers while growing up. |
| `releaseAuthorizingPerson` | Legal & Consents | object | Recommended/Non-Mandatory | Authorizing person for info release (Name, Address, Phone). |
| `authorizedAgencies` | Legal & Consents | array | Recommended/Non-Mandatory | Array of objects (Agency Name, Contact Person, Address, Phone). |
| `infoToDisclose` | Legal & Consents | textarea | Recommended/Non-Mandatory | Specific information to be disclosed under the release. |
| `releaseReason` | Legal & Consents | textarea | Recommended/Non-Mandatory | Stated reason for the information release. |
| `releaseExpirationDate` | Legal & Consents | date | Recommended/Non-Mandatory | Hard expiration date for the release authorization. |
| `releaseExpirationEvent` | Legal & Consents | string | Recommended/Non-Mandatory | Event triggering the expiration of the release. |
| `visitWaiverChildName` | Legal & Consents | string | Recommended/Non-Mandatory | Child's name referenced on the family visit waiver. |
| `visitWaiverSignatures` | Legal & Consents | array | Recommended/Non-Mandatory | Array of objects (Signature, Print Name, Relationship, Date). |
| `financialAidParentNames` | Financial Aid | array | Recommended/Non-Mandatory | Array of string names for parents/guardians applying for aid. |
| `financialAidCircumstances` | Financial Aid | textarea | Recommended/Non-Mandatory | Detailed explanation of financial circumstances for the application. |

## Read-Only Documents Identified
* **External Doctor Summaries:** "AFTER VISIT SUMMARY" (Columbia University)
* **External Provider Statements:** "Statement of Services" (alex STONE phd)
* **Informational Letters:** "The Family Visit" pages 1-2
* **Instructional Overviews:** "Financial Assistance" page 1 
* **Reference Lists:** "Gap Year Packing List"