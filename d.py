import streamlit as st
import pandas as pd
import plotly.express as px
from sklearn.ensemble import RandomForestRegressor

# 1. Page Configuration
st.set_page_config(page_title="Current Account", layout="wide", page_icon="🌍")

# --- CUSTOM FOOTER ---
st.markdown(
    """
    <style>
    .footer {
        position: fixed;
        left: 0;
        bottom: 0;
        width: 100%;
        background-color: transparent;
        color: gray;
        text-align: left;
        padding-left: 20px;
        padding-bottom: 10px;
        font-size: 12px;
        z-index: 1000;
    }
    .footer a {
        color: #007bff;
        text-decoration: none;
    }
    </style>
    <div class="footer">
        Created by <a href="https://github.com/sdiazprado" target="_blank">sdiazprado</a>
    </div>
    """,
    unsafe_allow_html=True
)

# 2. Data Loading & Mapping
@st.cache_data
def load_data():
    df = pd.read_excel('global_imbalances_panel_filled.xlsx', sheet_name=0)
    df['year'] = pd.to_numeric(df['year'], errors='coerce').astype('Int64')
    
    g32_map = {
        'ARG': 'Argentina', 'AUS': 'Australia', 'BRA': 'Brazil', 'CAN': 'Canada', 
        'CHE': 'Switzerland', 'CHN': 'China', 'DEU': 'Germany', 'DNK': 'Denmark', 
        'EGY': 'Egypt', 'ESP': 'Spain', 'EUU': 'European Union', 'FIN': 'Finland', 
        'FRA': 'France', 'GBR': 'United Kingdom', 'IDN': 'Indonesia', 'IND': 'India', 
        'IRL': 'Ireland', 'ITA': 'Italy', 'JPN': 'Japan', 'KOR': 'South Korea', 
        'MAR': 'Morocco', 'MEX': 'Mexico', 'NLD': 'Netherlands', 'NOR': 'Norway', 
        'PHL': 'Philippines', 'RUS': 'Russia', 'SAU': 'Saudi Arabia', 'SGP': 'Singapore', 
        'SWE': 'Sweden', 'TUR': 'Turkey', 'USA': 'United States', 'ZAF': 'South Africa'
    }
    
    df = df[df['iso3'].isin(g32_map.keys())].copy()
    df['country_name'] = df['iso3'].map(g32_map)
    
    df_codebook = pd.read_excel('global_imbalances_panel_filled.xlsx', sheet_name=1)
    if 'variable' in df_codebook.columns and 'description' in df_codebook.columns:
        mapping_dict = dict(zip(df_codebook['variable'], df_codebook['description']))
    else:
        mapping_dict = {}
        
    return df, mapping_dict

df, clean_names = load_data()

def format_var(raw_col):
    clean_name = clean_names.get(raw_col)
    if pd.isna(clean_name): 
        return str(raw_col).replace('_', ' ').title()
    return str(clean_name)

# Identify variables
non_graphable = ['iso3', 'country', 'country_name', 'year']
graphable_vars = sorted([col for col in df.columns if col not in non_graphable])
unique_countries = sorted(df['country_name'].dropna().unique())
available_years = sorted(df['year'].dropna().unique(), reverse=True)

# 3. App Header
st.title("Current Account Visualization")
st.markdown("Exploratory data tool")
st.divider()

# 4. TABS STRUCTURE (CORREGIDO: Ahora incluye la pestaña 5)
tab1, tab2, tab3, tab4, tab5 = st.tabs([
    "📈 1. Time Series", 
    "📊 2. Cross-Sectional Snapshot", 
    "🔍 3. Bivariate (Scatter)", 
    "🧮 4. Correlation Matrix",
    "🤖 5. ML Insights"
])

# --- TAB 1: TIME SERIES ---
with tab1:
    st.subheader("Temporal Evolution")
    col_c, col_v = st.columns([2, 2])
    with col_c:
        t1_countries = st.multiselect("Select Countries:", options=unique_countries, default=['United States', 'China', 'Germany', 'Mexico'], key="t1_c")
    with col_v:
        t1_var = st.selectbox("Select Variable:", options=graphable_vars, format_func=format_var, key="t1_v")
    
    anios_asc = sorted(available_years)
    col_y1, col_y2, col_spacer = st.columns([1, 1, 2])
    with col_y1:
        t1_start = st.selectbox("Start Year:", options=anios_asc, index=0, key="t1_start")
    with col_y2:
        t1_end = st.selectbox("End Year:", options=anios_asc, index=len(anios_asc)-1, key="t1_end")
    
    st.divider()

    if t1_start > t1_end:
        st.error("⚠️ The Start Year cannot be greater than the End Year.")
    elif t1_countries:
        df_t1 = df[df['country_name'].isin(t1_countries)].dropna(subset=[t1_var, 'year'])
        df_t1 = df_t1[(df_t1['year'] >= t1_start) & (df_t1['year'] <= t1_end)]
        
        if not df_t1.empty:
            fig1 = px.line(df_t1, x='year', y=t1_var, color='country_name', markers=True, template="simple_white")
            fig1.update_layout(xaxis_title="Year", yaxis_title=format_var(t1_var), legend_title="Country", hovermode="closest")
            st.plotly_chart(fig1, use_container_width=True)
        else:
            st.warning("No data available.")

# --- TAB 2: CROSS-SECTIONAL ---
with tab2:
    st.subheader("Cross-Sectional Distribution")
    col1, col2 = st.columns(2)
    with col1:
        t2_year = st.selectbox("Select Year:", options=available_years, index=0, key="t2_y")
    with col2:
        t2_var = st.selectbox("Select Variable:", options=graphable_vars, format_func=format_var, key="t2_v")
        
    df_t2 = df[df['year'] == t2_year].dropna(subset=[t2_var])
    if not df_t2.empty:
        c1, c2 = st.columns(2)
        with c1:
            df_sorted = df_t2.sort_values(by=t2_var, ascending=False)
            df_extremes = pd.concat([df_sorted.head(5), df_sorted.tail(5)]).drop_duplicates()
            df_extremes['color'] = df_extremes[t2_var].apply(lambda x: 'Positive' if x >= 0 else 'Negative')
            fig2a = px.bar(df_extremes, x=t2_var, y='country_name', orientation='h', color='color', color_discrete_map={'Positive': '#2ca02c', 'Negative': '#d62728'}, title=f"Top 5 & Bottom 5 ({t2_year})", template="simple_white")
            st.plotly_chart(fig2a, use_container_width=True)
        with c2:
            fig2b = px.histogram(df_t2, x=t2_var, title=f"Global Distribution ({t2_year})", template="simple_white")
            st.plotly_chart(fig2b, use_container_width=True)

# --- TAB 3: BIVARIATE ---
with tab3:
    st.subheader("Relationship & Tendency (OLS)")
    col1, col2, col3 = st.columns(3)
    with col1:
        t3_x = st.selectbox("X-Axis:", options=graphable_vars, index=1 if len(graphable_vars)>1 else 0, format_func=format_var, key="t3_x")
    with col2:
        t3_y = st.selectbox("Y-Axis:", options=graphable_vars, index=0, format_func=format_var, key="t3_y")
    with col3:
        t3_year = st.selectbox("Year:", options=available_years, index=0, key="t3_yr")
    
    df_t3 = df[df['year'] == t3_year].dropna(subset=[t3_x, t3_y])
    if not df_t3.empty:
        fig3 = px.scatter(df_t3, x=t3_x, y=t3_y, hover_name='country_name', text='iso3', trendline="ols", template="simple_white")
        st.plotly_chart(fig3, use_container_width=True)

# --- TAB 4: CORRELATION ---
with tab4:
    st.subheader("Multicollinearity Check")
    default_vars = graphable_vars[:5] if len(graphable_vars) >= 5 else graphable_vars
    t4_vars = st.multiselect("Select Variables:", options=graphable_vars, default=default_vars, format_func=format_var, key="t4_v")
    if len(t4_vars) > 1:
        corr_matrix = df[t4_vars].corr()
        fig4 = px.imshow(corr_matrix, text_auto=".2f", color_continuous_scale='RdBu_r', aspect="auto")
        st.plotly_chart(fig4, use_container_width=True)

# --- TAB 5: MACHINE LEARNING (FEATURE IMPORTANCE) ---
with tab5:
    st.subheader("🤖 Machine Learning Insights: Feature Importance")
    st.markdown("Using **Random Forest** to identify predictive power over Current Account Balance.")
    
    target = 'ca_gdp' # Asegúrate que este nombre sea el exacto en tu Excel
    
    if target in df.columns:
        
        features = [col for col in graphable_vars if col != target]
        df_ml = df[features + [target]].dropna()
        
        # Definimos qué variables NO queremos que el modelo use para no hacer trampa
        exclude_list = [target, 'ca_usd', 'current_account_usd', 'ca_gdp'] # Añade aquí los nombres exactos de las variables de CA que tengas
        
        features = [col for col in graphable_vars if col not in exclude_list]

        if not df_ml.empty:
            X, y = df_ml[features], df_ml[target]
            model = RandomForestRegressor(n_estimators=100, random_state=42)
            model.fit(X, y)
            
            importances = pd.DataFrame({
                'Variable': [format_var(f) for f in features],
                'Importance': model.feature_importances_
            }).sort_values(by='Importance', ascending=True)
            
            fig5 = px.bar(importances.tail(10), x='Importance', y='Variable', orientation='h', title="Top 10 Influential Variables", template="simple_white", color='Importance')
            st.plotly_chart(fig5, use_container_width=True)
            st.info("💡 **Interpretation:** Variables with higher scores are key candidates for your econometric model.")
        else:
            st.warning("Not enough clean data for ML.")
    else:
        st.error(f"Target '{target}' not found.")

