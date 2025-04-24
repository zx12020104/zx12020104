// 问答系统前端交互逻辑
$(document).ready(function() {
    // 初始化标签输入
    initTagInput();
    
    // 绑定点赞事件
    bindHelpfulEvents();
    
    // 绑定AI回答事件
    bindAIAnswerEvents();
    
    // 绑定表单验证
    bindFormValidation();
});

function initTagInput() {
    // 标签输入提示
    $('.tag-input').on('focus', function() {
        $(this).attr('placeholder', '输入标签，用逗号分隔');
    }).on('blur', function() {
        if ($(this).val() === '') {
            $(this).attr('placeholder', '');
        }
    });
}

function bindHelpfulEvents() {
    // 标记有帮助按钮点击事件
    $(document).on('click', '.helpful-btn', function(e) {
        e.preventDefault();
        const answerId = $(this).data('answer-id');
        const btn = $(this);
        
        if (btn.hasClass('disabled')) return;
        
        $.ajax({
            url: `/qa/answers/${answerId}/helpful/`,
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            },
            beforeSend: function() {
                btn.addClass('disabled');
            },
            success: function(data) {
                btn.find('.helpful-count').text(data.helpful_count);
                btn.addClass('btn-success').removeClass('btn-outline-secondary');
                showToast('感谢您的反馈！');
            },
            error: function(xhr) {
                if (xhr.status === 403) {
                    showToast('请先登录', 'error');
                } else {
                    showToast('操作失败，请重试', 'error');
                }
                btn.removeClass('disabled');
            }
        });
    });
}

function bindAIAnswerEvents() {
    // AI回答按钮点击事件（针对问题详情页）
    $(document).on('click', '.ai-answer-btn', function(e) {
        e.preventDefault();
        const questionId = $(this).data('question-id');
        const btn = $(this);
        
        if (btn.hasClass('disabled')) return;
        
        btn.addClass('disabled');
        btn.html('<i class="fas fa-spinner fa-spin"></i> AI思考中...');
        
        $.ajax({
            url: `/qa/questions/${questionId}/ai-answer/`,
            method: 'POST',
            data: {
                'question_id': questionId
            },
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            success: function(data) {
                if (data.success) {
                    showToast('AI回答已生成');
                    setTimeout(() => {
                        location.reload();
                    }, 1500);
                } else {
                    showToast(data.error || 'AI回答生成失败', 'error');
                }
            },
            error: function(xhr) {
                showToast('请求失败，请重试', 'error');
            },
            complete: function() {
                btn.removeClass('disabled');
                btn.html('<i class="fas fa-robot"></i> AI回答');
            }
        });
    });

    // AI直接回答表单提交（针对问答列表页）
    $('#ai-answer-form').on('submit', function(e) {
        e.preventDefault();
        const form = $(this);
        const btn = form.find('button[type="submit"]');
        const question = form.find('textarea[name="question"]').val().trim();
        const resultDiv = $('#ai-answer-result');
        const contentDiv = $('#ai-answer-content');
        
        if (!question) {
            showToast('请输入问题内容', 'error');
            return;
        }
        
        // 清除之前的结果
        contentDiv.html('');
        resultDiv.hide();
        
        // 显示加载状态
        btn.prop('disabled', true);
        btn.html('<i class="fas fa-spinner fa-spin"></i> AI思考中...');
        
        $.ajax({
            url: form.attr('action'),
            method: 'POST',
            data: form.serialize(),
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            success: function(data) {
                if (data.success) {
                    // 直接显示纯文本，使用CSS控制换行
                    // 强制清除缓存并设置文本
                    contentDiv.empty();
                    contentDiv.css('white-space', 'pre-line');
                    contentDiv.text(data.answer);
                    
                    resultDiv.slideDown();
                    showToast('AI回答已生成');
                } else {
                    showToast(data.error || '获取AI回答失败', 'error');
                    console.error('API Error:', data);
                }
            },
            error: function(xhr) {
                let errorMsg = '请求失败，请重试';
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMsg = xhr.responseJSON.error;
                }
                showToast(errorMsg, 'error');
                console.error('AJAX Error:', xhr);
            },
            complete: function() {
                btn.prop('disabled', false);
                btn.html('获取AI解答');
            }
        });
    });
}

function bindFormValidation() {
    // 问题表单验证
    $('#question-form').validate({
        rules: {
            title: {
                required: true,
                minlength: 10,
                maxlength: 200
            },
            content: {
                required: true,
                minlength: 20
            }
        },
        messages: {
            title: {
                required: "请输入问题标题",
                minlength: "标题至少需要10个字符",
                maxlength: "标题不能超过200个字符"
            },
            content: {
                required: "请输入问题内容",
                minlength: "内容至少需要20个字符"
            }
        },
        errorElement: 'div',
        errorPlacement: function(error, element) {
            error.addClass('invalid-feedback');
            element.closest('.form-group').append(error);
        },
        highlight: function(element, errorClass, validClass) {
            $(element).addClass('is-invalid');
        },
        unhighlight: function(element, errorClass, validClass) {
            $(element).removeClass('is-invalid');
        }
    });
    
    // 回答表单验证
    $('#answer-form').validate({
        rules: {
            content: {
                required: true,
                minlength: 20
            }
        },
        messages: {
            content: {
                required: "请输入回答内容",
                minlength: "内容至少需要20个字符"
            }
        },
        errorElement: 'div',
        errorPlacement: function(error, element) {
            error.addClass('invalid-feedback');
            element.closest('.form-group').append(error);
        },
        highlight: function(element, errorClass, validClass) {
            $(element).addClass('is-invalid');
        },
        unhighlight: function(element, errorClass, validClass) {
            $(element).removeClass('is-invalid');
        }
    });
}

// 辅助函数：获取Cookie
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// 显示Toast通知
function showToast(message, type = 'success') {
    const toast = $(`
        <div class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `);
    
    $('#toast-container').append(toast);
    const bsToast = new bootstrap.Toast(toast[0]);
    bsToast.show();
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}
