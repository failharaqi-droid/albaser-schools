import streamlit as st
import pandas as pd
import json
import plotly.express as px
import plotly.graph_objects as go

# إعداد الصفحة
st.set_page_config(
    page_title="نظام المحاسبة المدرسي - لوحة تحكم Streamlit",
    page_icon="🎓",
    layout="wide"
)

# تنسيق CSS مخصص للخطوط والاتجاه (RTL)
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap');
    html, body, [class*="css"] {
        font-family: 'Tajawal', sans-serif;
        direction: rtl;
        text-align: right;
    }
    .stMetric {
        text-align: right;
    }
</style>
""", unsafe_allow_html=True)

st.title("📊 لوحة تحكم نظام المحاسبة المدرسي")
st.write("أهلاً بك في منصة تحليل البيانات. يرجى رفع ملف النسخة الاحتياطية (JSON) من تطبيق المحاسبة للبدء.")

# رفع الملف
uploaded_file = st.file_uploader("اختر ملف النسخة الاحتياطية (.json)", type="json")

if uploaded_file is not None:
    try:
        data = json.load(uploaded_file)
        
        # استخراج الجداول الأساسية
        students = pd.DataFrame(data.get('students', []))
        payments = pd.DataFrame(data.get('payments', []))
        expenses = pd.DataFrame(data.get('expenses', []))
        staff = pd.DataFrame(data.get('staff', []))
        staff_payments = pd.DataFrame(data.get('staffPayments', []))

        # 1. قسم الإحصائيات السريعة
        st.header("📈 إحصائيات عامة")
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("عدد الطلاب", len(students))
        with col2:
            st.metric("عدد الموظفين", len(staff))
        with col3:
            total_income = payments['amount'].sum() if not payments.empty else 0
            st.metric("إجمالي الدخل", f"{total_income:,.0f} د.ع")
        with col4:
            total_expenses = expenses['amount'].sum() if not expenses.empty else 0
            st.metric("إجمالي المصاريف", f"{total_expenses:,.0f} د.ع")

        # 2. التحليل المالي
        st.divider()
        st.header("💰 التحليل المالي")
        
        tab1, tab2 = st.tabs(["الإيرادات والمصاريف", "رواتب الكادر"])
        
        with tab1:
            col_a, col_b = st.columns(2)
            
            with col_a:
                if not payments.empty:
                    payments['date'] = pd.to_datetime(payments['date'])
                    daily_payments = payments.groupby(payments['date'].dt.date)['amount'].sum().reset_index()
                    fig = px.line(daily_payments, x='date', y='amount', title="نمو الإيرادات عبر الزمن")
                    st.plotly_chart(fig, use_container_width=True)
                else:
                    st.info("لا توجد بيانات دفع متاحة")
            
            with col_b:
                if not expenses.empty:
                    fig = px.pie(expenses, values='amount', names='category', title="توزيع المصاريف حسب الفئة")
                    st.plotly_chart(fig, use_container_width=True)
                else:
                    st.info("لا توجد بيانات مصاريف متاحة")

        with tab2:
            if not staff_payments.empty:
                staff_payments['date'] = pd.to_datetime(staff_payments['date'])
                fig = px.bar(staff_payments, x='staffName', y='amount', color='type', title="رواتب وحوافز الموظفين")
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.info("لا توجد بيانات رواتب متاحة")

        # 3. قسم الطلاب
        st.divider()
        st.header("🎓 بيانات الطلاب")
        
        if not students.empty:
            grade_counts = students['grade'].value_counts().reset_index()
            fig = px.bar(grade_counts, x='index', y='grade', title="توزيع الطلاب حسب المراحل الدراسية", labels={'index': 'المرحلة', 'grade': 'عدد الطلاب'})
            st.plotly_chart(fig, use_container_width=True)
            
            st.subheader("قائمة الطلاب")
            st.dataframe(students[['name', 'grade', 'totalAmount', 'discount']])
        
    except Exception as e:
        st.error(f"حدث خطأ أثناء تحميل البيانات: {e}")

else:
    st.info("💡 قم بتصدير البيانات من تطبيق 'نظام المحاسبة المدرسي' بصيغة JSON ثم ارفعها هنا للحصول على تحليلات متقدمة.")
    
    st.subheader("مميزات منصة Streamlit للمدرسة:")
    st.markdown("""
    * **تقارير مالية تفاعلية**: رسوم بيانية توضح التدفق النقدي.
    * **توزيع المصاريف**: معرفة أين تذهب أموال المدرسة.
    * **نظرة شاملة**: إحصائيات فورية لعدد الطلاب والرواتب.
    * **سهولة الاستخدام**: ارفع ملف النسخة الاحتياطية وشاهد النتائج مباشرة.
    """)
