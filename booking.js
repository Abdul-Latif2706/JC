
/* ==========================================
   JONNIE'S CUTZ — APPOINTMENT BOOKING SYSTEM
   Supabase + EmailJS + Branches + Barbers
   Maximum 20 bookings per day
   Business + Customer Email Notifications
========================================== */

(() => {
    'use strict';

    // SUPABASE CONFIGURATION
    const SUPABASE_URL =
        'https://ibcavfsjdlsknlcottrt.supabase.co';

    const SUPABASE_KEY =
        'sb_publishable_6jjLWXliu2vHwjBmwnvz0w_SlXLleM3';

    // EMAILJS CONFIGURATION
    const EMAILJS_SERVICE_ID = 'service_7yest2m';

    // Business notification template
    const EMAILJS_ADMIN_TEMPLATE_ID = 'template_a98nvlb';

    // Customer confirmation template
    const EMAILJS_CUSTOMER_TEMPLATE_ID = 'template_tz17gk5';

    const EMAILJS_PUBLIC_KEY = 'TJx3FNm7lGoHznY_k';

    const DAILY_LIMIT = 20;

    // BRANCHES AND BARBERS
    const BARBERS = {
        'Abossey Okai': [
            'Godwin',
            'Agbeshie'
        ],

        'Zongo Market': [
            'Albert Korley',
            'Kekeli',
            'Rabi (Braider)',
            'Jonnie'
        ]
    };

    const originalForm =
        document.getElementById('booking-form');

    if (!originalForm) {
        console.error("Jonnie's Cutz booking form was not found.");
        return;
    }

    // PREVENT DUPLICATE FORM EVENT LISTENERS
    const form = originalForm.cloneNode(true);
    originalForm.replaceWith(form);

    // FORM ELEMENTS
    const nameInput =
        form.querySelector('#booking-name');

    const phoneInput =
        form.querySelector('#booking-phone');

    const emailInput =
        form.querySelector('#booking-email');

    const serviceSelect =
        form.querySelector('#booking-service');

    const messageInput =
        form.querySelector('#booking-message');

    const branchSelect =
        form.querySelector('#booking-branch');

    const barberSelect =
        form.querySelector('#booking-barber');

    const dateInput =
        form.querySelector('#booking-date');

    const timeSelect =
        form.querySelector('#booking-time');

    const status =
        form.querySelector('#booking-availability');

    const submitButton =
        form.querySelector('#booking-submit');

    const popup =
        document.getElementById('popup');

    if (
        !nameInput ||
        !phoneInput ||
        !emailInput ||
        !serviceSelect ||
        !branchSelect ||
        !barberSelect ||
        !dateInput ||
        !timeSelect ||
        !status ||
        !submitButton
    ) {
        console.error('Required booking form elements are missing.');
        return;
    }

    let availableSlotCount = 0;

    let bookingInProgress = false;

    function showStatus(message, type = '') {
        status.textContent = message;
        status.className = 'booking-availability ' + type;
    }

    function today() {
        const now = new Date();

        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    function updateSubmitButton() {
        submitButton.disabled = !(
            !bookingInProgress &&
            availableSlotCount > 0 &&
            nameInput.value.trim() &&
            phoneInput.value.trim() &&
            emailInput.validity.valid &&
            branchSelect.value &&
            barberSelect.value &&
            serviceSelect.value &&
            dateInput.value &&
            timeSelect.value
        );
    }

    // BRANCH SELECTION
    branchSelect.innerHTML = `
        <option value="">Select your preferred branch</option>
        <option value="Abossey Okai">Abossey Okai</option>
        <option value="Zongo Market">Zongo Market</option>
    `;

    function updateBarbers() {
        const selectedBranch = branchSelect.value;

        barberSelect.innerHTML =
            '<option value="">Select your barber</option>';

        barberSelect.disabled = true;

        if (!selectedBranch || !BARBERS[selectedBranch]) {
            updateSubmitButton();
            return;
        }

        BARBERS[selectedBranch].forEach(barber => {
            const option = document.createElement('option');

            option.value = barber;
            option.textContent = barber;

            barberSelect.appendChild(option);
        });

        barberSelect.disabled = false;
        updateSubmitButton();
    }

    branchSelect.addEventListener('change', updateBarbers);

    barberSelect.addEventListener('change', updateSubmitButton);

    // SUPABASE CONNECTION
    if (!window.supabase) {
        showStatus(
            'Booking service could not load. Please refresh.',
            'is-error'
        );

        submitButton.disabled = true;
        return;
    }

    const db = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

    dateInput.min = today();

    timeSelect.innerHTML =
        '<option value="">Select a date first</option>';

    timeSelect.disabled = true;
    barberSelect.disabled = true;
    submitButton.disabled = true;

    // FORM FIELD CHANGE LISTENERS
    [
        nameInput,
        phoneInput,
        emailInput,
        serviceSelect
    ].forEach(input => {
        input.addEventListener('input', updateSubmitButton);
        input.addEventListener('change', updateSubmitButton);
    });

    function formatTime(value) {
        const parts = value.substring(0, 5).split(':');

        let hour = Number(parts[0]);
        const minute = parts[1];

        const period = hour >= 12 ? 'PM' : 'AM';

        hour = hour % 12 || 12;

        return `${hour}:${minute} ${period}`;
    }

    // CHECK AVAILABLE APPOINTMENTS
    async function loadAvailableTimes() {
        const selectedDate = dateInput.value;

        availableSlotCount = 0;

        timeSelect.innerHTML =
            '<option value="">Loading available times...</option>';

        timeSelect.disabled = true;
        updateSubmitButton();

        if (!selectedDate) {
            timeSelect.innerHTML =
                '<option value="">Select a date first</option>';

            showStatus('Please select your appointment date.');
            return;
        }

        if (selectedDate < today()) {
            timeSelect.innerHTML =
                '<option value="">Invalid date</option>';

            showStatus(
                'Please select today or a future date.',
                'is-error'
            );

            return;
        }

        showStatus('Checking available appointments...');

        const { data, error } = await db.rpc(
            'get_available_slots',
            { p_date: selectedDate }
        );

        if (error) {
            console.error('Availability error:', error);

            timeSelect.innerHTML =
                '<option value="">Unable to load times</option>';

            showStatus(
                'Unable to load appointment times. Please try again.',
                'is-error'
            );

            return;
        }

        const slots = data || [];

        timeSelect.innerHTML = '';

        const fullyBooked =
            slots.length > 0 && slots[0].is_fully_booked;

        if (fullyBooked) {
            timeSelect.innerHTML =
                '<option value="">Fully Booked</option>';

            showStatus(
                'Sorry! We have reached our limit of 20 bookings for this date. Please choose another date.',
                'is-error'
            );

            return;
        }

        if (slots.length === 0) {
            timeSelect.innerHTML =
                '<option value="">No available times</option>';

            showStatus(
                'No available appointment times.',
                'is-error'
            );

            return;
        }

        const placeholder = document.createElement('option');

        placeholder.value = '';
        placeholder.textContent =
            'Choose an appointment time';

        timeSelect.appendChild(placeholder);

        slots.forEach(slot => {
            const option = document.createElement('option');

            const time =
                String(slot.slot_time).substring(0, 5);

            option.value = time;

            if (slot.is_taken) {
                option.textContent =
                    formatTime(time) + ' — TAKEN';

                option.disabled = true;
            } else {
                option.textContent =
                    formatTime(time) + ' — Available';

                availableSlotCount++;
            }

            timeSelect.appendChild(option);
        });

        timeSelect.disabled = availableSlotCount === 0;

        updateSubmitButton();

        if (availableSlotCount > 0) {
            showStatus(
                `${availableSlotCount} appointment times available. Maximum ${DAILY_LIMIT} bookings per day.`,
                'is-success'
            );
        } else {
            showStatus(
                'All appointment times have been taken.',
                'is-error'
            );
        }
    }

    dateInput.addEventListener('change', loadAvailableTimes);

    timeSelect.addEventListener('change', updateSubmitButton);

    // SHARED EMAIL TEMPLATE PARAMETERS
    function getEmailParameters(booking) {
        return {
            customer_name: booking.name,
            customer_email: booking.email,
            customer_phone: booking.phone,
            service: booking.service,
            branch: booking.branch,
            barber: booking.barber,
            booking_date: booking.date,
            booking_time: booking.time,
            message: booking.message
        };
    }

    // SEND BUSINESS NOTIFICATION
    async function sendAdminNotification(booking) {
        if (!window.emailjs) {
            throw new Error('EmailJS library has not loaded.');
        }

        return window.emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_ADMIN_TEMPLATE_ID,
            getEmailParameters(booking),
            EMAILJS_PUBLIC_KEY
        );
    }

    // SEND CUSTOMER CONFIRMATION
    async function sendCustomerConfirmation(booking) {
        if (!window.emailjs) {
            throw new Error('EmailJS library has not loaded.');
        }

        return window.emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_CUSTOMER_TEMPLATE_ID,
            getEmailParameters(booking),
            EMAILJS_PUBLIC_KEY
        );
    }

    // SHOW SUCCESS POPUP
    function showBookingPopup(booking) {
        if (!popup) return;

        popup.replaceChildren();

        const title = document.createElement('p');
        title.textContent = '✅ Booking Confirmed!';

        const branch = document.createElement('p');
        branch.textContent = `Branch: ${booking.branch}`;

        const barber = document.createElement('p');
        barber.textContent = `Barber: ${booking.barber}`;

        const date = document.createElement('p');
        date.textContent = `Date: ${booking.date}`;

        const time = document.createElement('p');
        time.textContent = `Time: ${booking.time}`;

        const thankYou = document.createElement('p');
        thankYou.textContent =
            "Thank you for choosing Jonnie's Cutz.";

        popup.append(
            title,
            branch,
            barber,
            date,
            time,
            thankYou
        );

        popup.style.display = 'block';

        setTimeout(() => {
            popup.style.display = 'none';
        }, 6000);
    }

    // SUBMIT BOOKING
    form.addEventListener('submit', async event => {
        event.preventDefault();

        if (bookingInProgress) return;

        const name = nameInput.value.trim();

        const phone = phoneInput.value.trim();

        const email = emailInput.value.trim();

        const service = serviceSelect.value.trim();

        const branch = branchSelect.value;

        const barber = barberSelect.value;

        const date = dateInput.value;

        const time = timeSelect.value;

        const message = messageInput
            ? messageInput.value.trim()
            : '';

        // VALIDATE CUSTOMER DETAILS
        if (
            !name ||
            !phone ||
            !email ||
            !emailInput.validity.valid ||
            !service ||
            !branch ||
            !barber ||
            !date ||
            !time
        ) {
            showStatus(
                'Please complete all required fields and enter a valid email address.',
                'is-error'
            );

            updateSubmitButton();
            return;
        }

        if (date < today()) {
            showStatus(
                'Please select a valid appointment date.',
                'is-error'
            );

            return;
        }

        if (
            !BARBERS[branch] ||
            !BARBERS[branch].includes(barber)
        ) {
            showStatus(
                'Please select a valid branch and barber.',
                'is-error'
            );

            return;
        }

        // PREVENT DOUBLE SUBMISSIONS
        bookingInProgress = true;

        submitButton.disabled = true;
        submitButton.textContent = 'Confirming...';

        showStatus('Confirming your appointment...');

        let bookingConfirmed = false;

        try {
            // STEP 1: SAVE BOOKING IN SUPABASE
            
const { data, error } = await db.rpc(
    'create_booking',
    {
        p_customer_name: name,
        p_phone: phone,
        p_service: service,
        p_date: date,
        p_time: time,
        p_branch: branch,
        p_barber: barber,
        p_message: message,
        p_customer_email: email
    }
);


            if (error) {
                cconsole.error(
    'Booking error details:',
    JSON.stringify(error, null, 2)
);

                showStatus(
                    'We could not confirm your booking. Please check availability and try again.',
                    'is-error'
                );

                await loadAvailableTimes();
                return;
            }

            if (!data || !data.success) {
                showStatus(
                    data?.message ||
                    'This appointment could not be confirmed.',
                    'is-error'
                );

                await loadAvailableTimes();
                return;
            }

            // THE BOOKING IS NOW CONFIRMED.
            // DO NOT CREATE ANOTHER BOOKING IF EMAIL FAILS.
            bookingConfirmed = true;

            const booking = {
                name,
                email,
                phone,
                service,
                branch,
                barber,
                date,
                time: formatTime(time),
                messageFF
            };

            // STEP 2: ATTEMPT BOTH EMAILS INDEPENDENTLY
            showStatus(
                'Your appointment is confirmed. Sending email notifications...'
            );

            const emailResults = await Promise.allSettled([
                sendAdminNotification(booking),
                sendCustomerConfirmation(booking)
            ]);

            const adminEmailSent =
                emailResults[0].status === 'fulfilled';

            const customerEmailSent =
                emailResults[1].status === 'fulfilled';

            if (!adminEmailSent) {
                console.error(
                    'Business notification failed:',
                    emailResults[0].reason
                );
            }

            if (!customerEmailSent) {
                console.error(
                    'Customer confirmation email failed:',
                    emailResults[1].reason
                );
            }

            // STEP 3: RESET FORM
            form.reset();

            updateBarbers();

            dateInput.min = today();

            timeSelect.innerHTML =
                '<option value="">Select a date first</option>';

            timeSelect.disabled = true;

            availableSlotCount = 0;

            // STEP 4: DISPLAY BOOKING RESULT
            if (adminEmailSent && customerEmailSent) {
                showStatus(
                    'Your appointment is confirmed! Confirmation emails have been sent to you and Jonnie’s Cutz.',
                    'is-success'
                );
            } else if (adminEmailSent) {
                showStatus(
                    'Your appointment is confirmed! Jonnie’s Cutz has been notified, but your confirmation email could not be sent.',
                    'is-success'
                );
            } else if (customerEmailSent) {
                showStatus(
                    'Your appointment is confirmed! Your confirmation email has been sent, but the business notification failed.',
                    'is-success'
                );
            } else {
                showStatus(
                    'Your appointment is confirmed, but both email notifications failed. Please contact Jonnie’s Cutz if you need assistance.',
                    'is-success'
                );
            }

            showBookingPopup(booking);

            console.log('Booking confirmed successfully.');

            console.log('Business email sent:', adminEmailSent);

            console.log('Customer email sent:', customerEmailSent);

        } catch (error) {
            console.error('Unexpected booking error:', error);

            if (bookingConfirmed) {
                // NEVER RETRY THE BOOKING AFTER CONFIRMATION.
                showStatus(
                    'Your appointment is confirmed. There was a problem completing the email or display process. Please do not submit another booking.',
                    'is-success'
                );
            } else {
                showStatus(
                    'Something went wrong while confirming your appointment. Please try again.',
                    'is-error'
                );

                await loadAvailableTimes();
            }

        } finally {
            bookingInProgress = false;

            submitButton.textContent = 'Book Now';

            updateSubmitButton();
        }
    });

    showStatus(
        'Select your branch, barber and appointment date to get started.'
    );

})();
