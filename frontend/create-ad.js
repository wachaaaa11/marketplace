// JavaScript для страницы создания объявления

let currentStep = 1;
let selectedCategory = '';
let uploadedImages = [];

// Инициализация страницы создания объявления
function initializeCreateAdPage() {
    setupStepNavigation();
    setupImageUpload();
    setupFormValidation();
    setupCategorySelection();
}

// Настройка навигации по шагам
function setupStepNavigation() {
    const nextBtn = document.getElementById('nextStep');
    const prevBtn = document.getElementById('prevStep');
    const publishBtn = document.getElementById('publishBtn');

    if (nextBtn) nextBtn.addEventListener('click', nextStep);
    if (prevBtn) prevBtn.addEventListener('click', prevStep);
    if (publishBtn) publishBtn.addEventListener('click', publishAd);
}

// Настройка загрузки изображений
function setupImageUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const selectFilesBtn = document.getElementById('selectFiles');

    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleDrop);
        fileInput.addEventListener('change', handleFileSelect);
    }

    if (selectFilesBtn) {
        selectFilesBtn.addEventListener('click', () => fileInput.click());
    }
}

// Настройка валидации формы
function setupFormValidation() {
    const inputs = document.querySelectorAll('input[required], select[required], textarea[required]');
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearFieldError);
    });
}

// Настройка выбора категории
function setupCategorySelection() {
    const categoryOptions = document.querySelectorAll('.category-option');
    categoryOptions.forEach(option => {
        option.addEventListener('click', () => selectCategory(option));
    });
}

// Переход к следующему шагу
function nextStep() {
    if (validateCurrentStep()) {
        if (currentStep < 4) {
            currentStep++;
            updateStepDisplay();
        }
    }
}

// Переход к предыдущему шагу
function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        updateStepDisplay();
    }
}

// Обновление отображения шагов
function updateStepDisplay() {
    const stepIndicators = document.querySelectorAll('.step-indicator');
    stepIndicators.forEach((indicator, index) => {
        const stepNumber = index + 1;
        indicator.classList.remove('active', 'completed');
        
        if (stepNumber < currentStep) {
            indicator.classList.add('completed');
        } else if (stepNumber === currentStep) {
            indicator.classList.add('active');
        }
    });

    const formSteps = document.querySelectorAll('.form-step');
    formSteps.forEach((step, index) => {
        step.classList.remove('active');
        if (index + 1 === currentStep) {
            step.classList.add('active');
        }
    });

    const prevBtn = document.getElementById('prevStep');
    const nextBtn = document.getElementById('nextStep');
    const publishBtn = document.getElementById('publishBtn');

    if (prevBtn) prevBtn.classList.toggle('hidden', currentStep === 1);

    if (nextBtn && publishBtn) {
        if (currentStep === 4) {
            nextBtn.classList.add('hidden');
            publishBtn.classList.remove('hidden');
        } else {
            nextBtn.classList.remove('hidden');
            publishBtn.classList.add('hidden');
        }
    }

    anime({
        targets: '.form-step.active',
        opacity: [0, 1],
        translateX: [50, 0],
        duration: 500,
        easing: 'easeOutQuart'
    });
}

// Выбор категории
function selectCategory(option) {
    document.querySelectorAll('.category-option').forEach(opt => {
        opt.classList.remove('selected');
    });

    option.classList.add('selected');
    selectedCategory = option.dataset.category;
    document.getElementById('selectedCategory').value = selectedCategory;

    anime({
        targets: option,
        scale: [1, 1.05, 1],
        duration: 300,
        easing: 'easeOutQuart'
    });
}

// Drag & Drop
function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('dragover');
}

function handleDragLeave(event) {
    event.currentTarget.classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    
    const files = Array.from(event.dataTransfer.files);
    processFiles(files);
}

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    processFiles(files);
}

// Обработка выбранных файлов
function processFiles(files) {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
        showToast('Выберите изображения', 'error');
        return;
    }

    if (uploadedImages.length + imageFiles.length > 10) {
        showToast('Максимум 10 изображений', 'error');
        return;
    }

    imageFiles.forEach(file => {
        if (file.size > 5 * 1024 * 1024) {
            showToast(`Файл ${file.name} слишком большой`, 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedImages.push(e.target.result);
            updateImagePreview();
        };
        reader.readAsDataURL(file);
    });
}

// Превью изображений
function updateImagePreview() {
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');

    if (uploadedImages.length > 0) {
        imagePreview.classList.remove('hidden');
        previewContainer.innerHTML = '';

        uploadedImages.forEach((preview, index) => {
            const div = document.createElement('div');
            div.className = 'image-preview';
            div.innerHTML = `
                <img src="${preview}" alt="Preview">
                <button type="button" class="remove-image" onclick="removeImage(${index})">×</button>
            `;
            previewContainer.appendChild(div);
        });
    } else {
        imagePreview.classList.add('hidden');
    }
}

function removeImage(index) {
    uploadedImages.splice(index, 1);
    updateImagePreview();
}

// Валидация шагов
function validateCurrentStep() {
    switch (currentStep) {
        case 1: return validateCategory();
        case 2: return validateBasicInfo();
        case 3: return true;
        case 4: return true; // Контактов больше нет
    }
    return true;
}

function validateCategory() {
    if (!selectedCategory) {
        showToast('Выберите категорию', 'error');
        return false;
    }
    return true;
}

function validateBasicInfo() {
    const requiredFields = ['title', 'description', 'price', 'location', 'condition'];
    let isValid = true;

    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && !field.value.trim()) {
            showFieldError(field, 'Это поле обязательно');
            isValid = false;
        }
    });

    return isValid;
}

function validateField(event) {
    const field = event.target;
    if (field.hasAttribute('required') && !field.value.trim()) {
        showFieldError(field, 'Это поле обязательно');
    }
}

function clearFieldError(event) {
    const field = event.target;
    const errorElement = field.parentNode.querySelector('.field-error');
    if (errorElement) errorElement.remove();
    field.classList.remove('border-red-500');
}

function showFieldError(field, message) {
    field.classList.add('border-red-500');
    
    let errorElement = field.parentNode.querySelector('.field-error');
    if (!errorElement) {
        errorElement = document.createElement('p');
        errorElement.className = 'field-error text-red-500 text-sm mt-1';
        field.parentNode.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
}

// карта городов
const cityMap = {
    "moscow": "Москва",
    "spb": "Санкт-Петербург",
    "ekb": "Екатеринбург",
    "kazan": "Казань",
    "novosibirsk": "Новосибирск",
    "nizhny-novgorod": "Нижний Новгород",
    "chelyabinsk": "Челябинск",
    "samara": "Самара",
    "rostov": "Ростов-на-Дону",
    "ufa": "Уфа"
};

// Публикация объявления
async function publishAd() {
    if (!validateCurrentStep()) return;

    const userId = localStorage.getItem("userId");
    if (!userId) {
        showToast("Вы должны войти!", "error");
        return;
    }

    const selectedLocationCode = document.getElementById('location').value;
    const location = cityMap[selectedLocationCode] || selectedLocationCode;

    if (uploadedImages.length === 0) {
    	uploadedImages.push("https://st.depositphotos.com/2934765/53192/v/450/depositphotos_531920820-stock-illustration-photo-available-vector-icon-default.jpg");
    }
    
    const formData = {
        user_id: userId,
        category: selectedCategory,
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        price: parseInt(document.getElementById('price').value),
        location,
        condition: document.getElementById('condition').value,
        allowMessages: document.getElementById('allowMessages').checked,
        showPhone: document.getElementById('showPhone').checked,
        acceptBargain: document.getElementById('acceptBargain').checked,
        images: uploadedImages
    };

    try {
        showToast('Публикация объявления...', 'info');

        const response = await fetch('/api/ads/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            showToast('Объявление опубликовано!', 'success');
            setTimeout(() => {
                window.location.href = `ads.html`;
            }, 1500);
        } else {
            showToast(result.error || 'Ошибка', 'error');
        }
    } catch (error) {
        console.error('Error publishing ad:', error);
        showToast('Ошибка при публикации', 'error');
    }
}
