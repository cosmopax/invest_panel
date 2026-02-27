import type { knowledgeEntries } from "@/lib/db/schema";

type KnowledgeSeed = Omit<
  typeof knowledgeEntries.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;

export const KNOWLEDGE_SEEDS: KnowledgeSeed[] = [
  // ============================================================
  // FINANCIAL MATHEMATICS (10)
  // ============================================================
  {
    title: "Black-Scholes-Merton Model",
    slug: "black-scholes-merton",
    domain: "financial_math",
    subdomain: "pricing_models",
    summary:
      "The foundational options pricing model that derives the theoretical price of European-style options using geometric Brownian motion, establishing that options can be perfectly hedged by continuously rebalancing a portfolio of the underlying asset and risk-free bonds.",
    explanation: `The Black-Scholes-Merton (BSM) model, published in 1973, revolutionized finance by providing the first closed-form solution for pricing European options. The model assumes the underlying asset follows geometric Brownian motion with constant volatility and drift.

The key insight is the concept of **risk-neutral pricing**: by constructing a self-financing portfolio that replicates the option payoff, the option price becomes independent of investors' risk preferences. This leads to the **Black-Scholes PDE**, which can be solved analytically for European calls and puts.

The model produces the famous "Greeks" — sensitivities of option price to various parameters:
- **Delta (Δ)**: sensitivity to underlying price
- **Gamma (Γ)**: rate of change of delta
- **Theta (Θ)**: time decay
- **Vega (ν)**: sensitivity to volatility
- **Rho (ρ)**: sensitivity to interest rate

While the assumptions (constant volatility, no dividends, continuous trading) are violated in practice, BSM remains the benchmark against which all other models are compared.`,
    mathematicalFormulation: `C = S_0 N(d_1) - K e^{-rT} N(d_2)

P = K e^{-rT} N(-d_2) - S_0 N(-d_1)

d_1 = \\frac{\\ln(S_0/K) + (r + \\sigma^2/2)T}{\\sigma\\sqrt{T}}

d_2 = d_1 - \\sigma\\sqrt{T}`,
    practicalApplication: `Use BSM to quickly estimate fair value of European options on stocks in your portfolio. Compare BSM-implied volatility across strike prices to identify the "volatility smile" — deviations reveal market expectations of tail risk. When implied vol is significantly above historical vol, options may be overpriced (consider selling). The Greeks guide hedging: use delta to determine hedge ratios, monitor gamma near expiry, and track theta for time-sensitive strategies.`,
    limitations:
      "Assumes constant volatility (violated by volatility smile/skew), continuous trading (discrete in practice), log-normal returns (fat tails exist), no dividends (extension available), no transaction costs. American options require numerical methods.",
    authors: ["Fischer Black", "Myron Scholes", "Robert Merton"],
    year: 1973,
    sourceUrl: "https://doi.org/10.1086/260062",
    tags: ["options", "derivatives", "volatility", "Greeks", "hedging"],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.95,
  },
  {
    title: "Capital Asset Pricing Model (CAPM)",
    slug: "capm",
    domain: "financial_math",
    subdomain: "portfolio_theory",
    summary:
      "Relates expected return of an asset to its systematic risk (beta) relative to the market portfolio, establishing that only non-diversifiable risk is compensated in equilibrium.",
    explanation: `CAPM, developed independently by Sharpe (1964), Lintner (1965), and Mossin (1966), is the equilibrium counterpart to Markowitz's portfolio theory. It answers: what return should investors expect for bearing risk?

The core insight: in equilibrium, all investors hold the same "market portfolio" combined with risk-free lending/borrowing. An asset's expected return depends only on its **beta (β)** — its covariance with the market divided by market variance. Idiosyncratic risk is diversifiable and thus uncompensated.

The **Security Market Line (SML)** plots expected return against beta. Assets above the SML are undervalued (positive alpha); below are overvalued. This provides a benchmark for evaluating fund manager performance — "alpha" is return above what CAPM predicts for a given beta.`,
    mathematicalFormulation: `E[R_i] = R_f + \\beta_i (E[R_m] - R_f)

\\beta_i = \\frac{\\text{Cov}(R_i, R_m)}{\\text{Var}(R_m)}`,
    practicalApplication: `Use CAPM to set return expectations for individual holdings. Calculate beta using 2-5 years of monthly returns against a broad index. A stock with β=1.5 should return 1.5× the equity risk premium above risk-free. If it returns less, it's destroying value on a risk-adjusted basis. Use as a simple screening tool: only hold assets whose expected returns justify their beta.`,
    limitations:
      "Single-factor model ignores size, value, momentum. Assumes market portfolio is observable (it isn't — Roll's critique). Beta is unstable over time. Empirical evidence shows low-beta stocks outperform predictions (low-volatility anomaly).",
    authors: ["William Sharpe", "John Lintner", "Jan Mossin"],
    year: 1964,
    tags: ["beta", "risk-premium", "equilibrium", "systematic-risk"],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.9,
  },
  {
    title: "Fama-French Three-Factor Model",
    slug: "fama-french-three-factor",
    domain: "financial_math",
    subdomain: "portfolio_theory",
    summary:
      "Extends CAPM with two additional factors — firm size (SMB) and book-to-market value (HML) — to explain cross-sectional variation in stock returns that beta alone cannot capture.",
    explanation: `Eugene Fama and Kenneth French (1993) demonstrated that CAPM's single market factor fails to explain why small-cap stocks and high book-to-market (value) stocks earn higher returns than predicted. They introduced two additional factors:

- **SMB (Small Minus Big)**: return difference between small-cap and large-cap portfolios
- **HML (High Minus Low)**: return difference between high and low book-to-market portfolios

The model explains ~90% of diversified portfolio return variation, compared to ~70% for CAPM alone. Later extended to five factors (2015) adding profitability (RMW) and investment (CMA).

The debate continues: are these factors risk premia (rational) or anomalies (behavioral)? Value and size effects have weakened since publication — partly due to crowding, partly genuine factor decay.`,
    mathematicalFormulation: `E[R_i] - R_f = \\beta_i^{MKT}(E[R_m] - R_f) + \\beta_i^{SMB} \\cdot SMB + \\beta_i^{HML} \\cdot HML`,
    practicalApplication: `Decompose your portfolio's returns into market, size, and value exposures using regression. If a fund claims alpha but loads heavily on SMB and HML, the "alpha" is just factor exposure you could get cheaply via ETFs. Use factor tilts deliberately: overweight small-value in long-horizon portfolios (if you accept the risk), but understand these factors can underperform for a decade.`,
    limitations:
      "Factors may be data-mined. Size and value premiums have shrunk post-publication. Model doesn't explain momentum. Five-factor extension still misses short-term reversal and low-volatility effects.",
    authors: ["Eugene Fama", "Kenneth French"],
    year: 1993,
    sourceUrl: "https://doi.org/10.1016/0304-405X(93)90023-5",
    tags: ["factor-models", "size-effect", "value-effect", "cross-section"],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.9,
  },
  {
    title: "Kelly Criterion",
    slug: "kelly-criterion",
    domain: "financial_math",
    subdomain: "position_sizing",
    summary:
      "The mathematically optimal bet sizing formula that maximizes the long-term geometric growth rate of wealth, derived from information theory, showing that over-betting is as costly as under-betting.",
    explanation: `John Kelly (1956) at Bell Labs derived the optimal fraction of capital to wager when you have an edge. The formula maximizes the expected logarithm of wealth — equivalent to maximizing the geometric growth rate.

The key insight is that **geometric growth** (what actually compounds) differs from **arithmetic expectation**. A bet with positive expected value can still ruin you if sized too large, because the geometric mean is always less than or equal to the arithmetic mean.

Full Kelly is aggressive — it tolerates 50% drawdowns. Most practitioners use **fractional Kelly** (¼ to ½ Kelly) to reduce variance while maintaining most of the growth benefit. The growth rate drops only as the square of the fraction, so half-Kelly gives 75% of the growth with far less volatility.`,
    mathematicalFormulation: `f^* = \\frac{p}{a} - \\frac{q}{b}

\\text{where } p = \\text{probability of win, } q = 1-p

a = \\text{loss fraction, } b = \\text{gain fraction}

\\text{Continuous: } f^* = \\frac{\\mu - r}{\\sigma^2}`,
    practicalApplication: `Apply fractional Kelly (¼ to ½) to determine position sizing. For a stock with estimated 12% expected return, 7% risk-free rate, and 20% volatility: full Kelly = (0.12 - 0.07) / 0.04 = 1.25 (125% — leverage). Half Kelly = 62.5%. This is aggressive; most investors should use ¼ Kelly. The framework prevents both over-concentration and excessive diversification.`,
    limitations:
      "Requires knowing true probabilities and payoffs (unknowable in practice). Assumes constant opportunities and no transaction costs. Full Kelly is too volatile for most investors. Serial correlation in returns violates independence assumption.",
    authors: ["John L. Kelly Jr."],
    year: 1956,
    tags: [
      "position-sizing",
      "bet-sizing",
      "geometric-growth",
      "information-theory",
    ],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.9,
  },
  {
    title: "Monte Carlo Simulation",
    slug: "monte-carlo-simulation",
    domain: "financial_math",
    subdomain: "pricing_models",
    summary:
      "A computational technique that uses repeated random sampling to estimate the probability distribution of outcomes, essential for pricing complex derivatives and modeling portfolio risk under various scenarios.",
    explanation: `Monte Carlo methods generate thousands of random paths for asset prices (or other financial variables) and compute statistics from the resulting distribution. Named after the Monte Carlo casino, the technique was formalized by Stanislaw Ulam and John von Neumann during the Manhattan Project.

In finance, Monte Carlo is used when analytical solutions don't exist:
- **Derivative pricing**: path-dependent options (Asian, barrier, lookback) that resist closed-form solutions
- **Portfolio risk**: VaR and CVaR estimation under complex correlation structures
- **Retirement planning**: probability of portfolio survival under various withdrawal rates
- **Scenario analysis**: stress testing portfolios against simulated market regimes

The power lies in flexibility — any model of returns can be simulated. The cost is computation time and the need for good random number generators. Variance reduction techniques (antithetic variates, control variates, importance sampling) dramatically improve efficiency.`,
    mathematicalFormulation: `S_T = S_0 \\exp\\left[(r - \\frac{\\sigma^2}{2})T + \\sigma\\sqrt{T}\\,Z\\right]

Z \\sim N(0, 1)

\\text{Price} \\approx e^{-rT} \\frac{1}{N} \\sum_{i=1}^{N} \\text{payoff}(S_T^{(i)})`,
    practicalApplication: `Run Monte Carlo simulations on your portfolio to estimate the distribution of 1-year outcomes. Simulate 10,000 paths using historical return distributions (not just normal — use empirical or t-distribution for fat tails). Report the 5th percentile as your worst-case estimate. For retirement planning, simulate 30-year paths with varying withdrawal rates to find the safe withdrawal rate for your specific allocation.`,
    limitations:
      "Garbage in, garbage out — results are only as good as the assumed return distributions and correlations. Computationally intensive for high-dimensional problems. Doesn't capture structural breaks or regime changes unless explicitly modeled.",
    authors: ["Stanislaw Ulam", "John von Neumann"],
    year: 1949,
    tags: [
      "simulation",
      "stochastic",
      "risk-modeling",
      "derivative-pricing",
    ],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.85,
  },
  {
    title: "Modern Portfolio Theory (Markowitz)",
    slug: "modern-portfolio-theory",
    domain: "financial_math",
    subdomain: "portfolio_theory",
    summary:
      "The mathematical framework showing that portfolio risk depends not just on individual asset volatilities but critically on correlations, enabling construction of an 'efficient frontier' of portfolios offering maximum return for each risk level.",
    explanation: `Harry Markowitz's 1952 paper launched quantitative finance. The core insight: **diversification is not just about holding many assets, but about how they move together**. Two volatile assets with low correlation can form a portfolio less volatile than either alone.

The **efficient frontier** is the set of portfolios with the highest return for each level of risk (standard deviation). Rational investors choose portfolios on this frontier; anything below is suboptimal (you can get more return for the same risk).

The **minimum variance portfolio** sits at the leftmost point of the frontier. The **tangent portfolio** (where a line from the risk-free rate touches the frontier) is the optimal risky portfolio — all investors should hold some combination of this portfolio and the risk-free asset (this leads to CAPM).

In practice, mean-variance optimization is notoriously sensitive to input estimates. Small changes in expected returns produce wildly different allocations. Robust alternatives include:
- Resampled efficient frontier (Michaud)
- Black-Litterman model
- Risk parity (equal risk contribution)`,
    mathematicalFormulation: `\\min_w \\quad w^T \\Sigma w

\\text{s.t.} \\quad w^T \\mu = \\mu_p, \\quad w^T \\mathbf{1} = 1

\\sigma_p^2 = \\sum_i \\sum_j w_i w_j \\sigma_i \\sigma_j \\rho_{ij}`,
    practicalApplication: `Use mean-variance optimization as a starting point, but regularize aggressively. Constrain maximum position sizes (e.g., no single position > 20%). Use shrinkage estimators for the covariance matrix (Ledoit-Wolf). Compare your portfolio's position on the efficient frontier — if it's far below, you're taking uncompensated risk. Risk parity (weighting by inverse volatility) often outperforms naive mean-variance in practice.`,
    limitations:
      "Extremely sensitive to input estimates (especially expected returns). Assumes normal distributions (misses fat tails). Static single-period framework. Correlation matrices are unstable and increase in crises. Transaction costs ignored.",
    authors: ["Harry Markowitz"],
    year: 1952,
    sourceUrl: "https://doi.org/10.2307/2975974",
    tags: [
      "portfolio-construction",
      "efficient-frontier",
      "diversification",
      "optimization",
    ],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.95,
  },
  {
    title: "Value at Risk (VaR)",
    slug: "value-at-risk",
    domain: "financial_math",
    subdomain: "risk_metrics",
    summary:
      "A statistical measure that quantifies the maximum expected loss over a specific time horizon at a given confidence level, widely used in risk management despite its known limitations in capturing tail risk.",
    explanation: `VaR answers: "What is the worst loss I can expect with X% confidence over Y days?" For example, a 1-day 95% VaR of €100,000 means there's a 5% chance of losing more than €100,000 in a single day.

Three main calculation methods:
1. **Historical simulation**: use actual past returns, no distributional assumptions
2. **Variance-covariance (parametric)**: assume normal distribution, use mean and standard deviation
3. **Monte Carlo**: simulate thousands of scenarios

VaR became the industry standard after J.P. Morgan's RiskMetrics (1994). Regulators (Basel II/III) mandate VaR for bank capital requirements.

**Conditional VaR (CVaR / Expected Shortfall)** addresses VaR's biggest flaw: VaR says nothing about losses *beyond* the threshold. CVaR computes the average loss in the worst X% of scenarios — it's a more coherent risk measure.`,
    mathematicalFormulation: `\\text{VaR}_{\\alpha}(X) = -\\inf\\{x : P(X \\leq x) > \\alpha\\}

\\text{Parametric: } \\text{VaR}_{\\alpha} = \\mu + z_{\\alpha} \\sigma

\\text{CVaR}_{\\alpha} = E[X \\mid X \\leq -\\text{VaR}_{\\alpha}]`,
    practicalApplication: `Calculate your portfolio's VaR using historical returns (at least 2 years of daily data). Report both 95% and 99% VaR. More importantly, compute CVaR to understand tail risk. If CVaR is much larger than VaR, your portfolio has fat tail exposure. Compare VaR to your actual maximum acceptable loss — if VaR exceeds your pain threshold, reduce position sizes or add hedges.`,
    limitations:
      "Not subadditive (diversified VaR can exceed sum of individual VaRs). Tells nothing about loss magnitude beyond the threshold. Assumes stationary returns. Historically poor at predicting extreme events (2008). CVaR/ES is preferred by modern risk managers.",
    authors: ["Philippe Jorion", "J.P. Morgan RiskMetrics"],
    year: 1994,
    tags: [
      "risk-management",
      "tail-risk",
      "regulatory-capital",
      "expected-shortfall",
    ],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.88,
  },
  {
    title: "Sharpe Ratio & Risk-Adjusted Returns",
    slug: "sharpe-ratio",
    domain: "financial_math",
    subdomain: "risk_metrics",
    summary:
      "The most widely used metric for comparing investment performance on a risk-adjusted basis, measuring excess return per unit of total risk (standard deviation).",
    explanation: `William Sharpe (1966) proposed measuring performance by the ratio of excess return (above the risk-free rate) to standard deviation. A higher Sharpe ratio indicates better risk-adjusted returns.

Typical benchmarks:
- **< 0.5**: poor
- **0.5-1.0**: adequate
- **1.0-2.0**: good
- **> 2.0**: exceptional (often unsustainable or indicating hidden risk)

The **Sortino ratio** improves on Sharpe by using only downside deviation — it doesn't penalize upside volatility. The **Information ratio** measures active return relative to tracking error against a benchmark.

Sharpe ratio is additive: a portfolio's Sharpe equals the weighted average of component Sharpes only if correlations are zero. In practice, combining uncorrelated strategies with moderate individual Sharpes can produce a high portfolio Sharpe — the mathematical basis for diversification.`,
    mathematicalFormulation: `S = \\frac{E[R_p] - R_f}{\\sigma_p}

\\text{Sortino} = \\frac{E[R_p] - R_f}{\\sigma_d}

\\text{Information} = \\frac{E[R_p] - E[R_b]}{\\sigma(R_p - R_b)}`,
    practicalApplication: `Calculate the Sharpe ratio of your portfolio monthly using trailing 12-month returns and the current risk-free rate (German Bund for EUR). Compare against benchmarks: MSCI World typically delivers 0.3-0.5 Sharpe. If your portfolio Sharpe < benchmark Sharpe, you're adding complexity without adding value. Use Sortino if your return distribution is skewed (e.g., option-selling strategies).`,
    limitations:
      "Assumes normal returns (penalizes positive skewness equally as negative). Backward-looking. Can be gamed (smoothing returns, illiquid assets). Meaningless for negative expected returns. Time-period dependent.",
    authors: ["William F. Sharpe"],
    year: 1966,
    tags: [
      "performance-measurement",
      "risk-adjusted",
      "sortino",
      "information-ratio",
    ],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.88,
  },
  {
    title: "Arbitrage Pricing Theory (APT)",
    slug: "arbitrage-pricing-theory",
    domain: "financial_math",
    subdomain: "portfolio_theory",
    summary:
      "A multi-factor asset pricing model that explains expected returns through exposure to multiple systematic risk factors, without requiring the restrictive assumptions of CAPM.",
    explanation: `Stephen Ross (1976) proposed APT as a more general alternative to CAPM. While CAPM relies on mean-variance optimization and a single market factor, APT uses a no-arbitrage argument: if asset returns are generated by multiple factors, then expected returns must be linear in factor exposures, or else arbitrage opportunities would exist.

APT doesn't specify *which* factors matter — this is both a strength (generality) and weakness (ambiguity). Common factor candidates include:
- Market return, GDP growth, inflation, interest rate changes
- Oil prices, exchange rates, credit spreads
- Industry-specific factors

The Chen, Roll, and Ross (1986) study identified: industrial production growth, unexpected inflation, changes in expected inflation, term structure (long-short yield spread), and credit spread as significant pricing factors.

APT requires fewer assumptions than CAPM (no market portfolio, no utility function) but more factors to estimate, creating a practical trade-off.`,
    mathematicalFormulation: `E[R_i] = R_f + \\beta_{i1}\\lambda_1 + \\beta_{i2}\\lambda_2 + \\cdots + \\beta_{ik}\\lambda_k

R_i = a_i + \\beta_{i1}F_1 + \\beta_{i2}F_2 + \\cdots + \\beta_{ik}F_k + \\epsilon_i`,
    practicalApplication: `Use APT-style factor models to decompose your portfolio risk. Run a regression of portfolio returns against macro factors (equity market, rates, credit, commodities, currencies). This reveals hidden factor exposures — e.g., a "diversified" portfolio that actually loads entirely on the growth factor. Use to construct truly diversified portfolios across independent risk sources.`,
    limitations:
      "Doesn't specify factors (researcher must choose). Factor selection can be data-mined. Requires estimating many parameters. In practice, converges toward empirical factor models (Fama-French) anyway.",
    authors: ["Stephen Ross"],
    year: 1976,
    tags: ["factor-models", "no-arbitrage", "multi-factor", "systematic-risk"],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.85,
  },
  {
    title: "Mean-Variance Optimization",
    slug: "mean-variance-optimization",
    domain: "financial_math",
    subdomain: "portfolio_theory",
    summary:
      "The mathematical procedure for finding portfolio weights that minimize variance for a target return (or maximize return for a target variance), forming the computational backbone of Modern Portfolio Theory.",
    explanation: `Mean-variance optimization (MVO) is the practical implementation of Markowitz's theory. Given N assets with expected returns μ, covariance matrix Σ, and portfolio weights w, the optimizer solves a quadratic program.

In practice, MVO is infamous for producing extreme, unintuitive allocations that are hypersensitive to input estimation errors — especially expected returns. Chopra and Ziemba (1993) showed that errors in expected returns are 10× more impactful than errors in covariances.

**Practical remedies**:
- **Shrinkage estimators** for covariance (Ledoit-Wolf shrinks toward structured target)
- **Black-Litterman**: start from equilibrium returns, blend in investor views
- **Resampled MVO** (Michaud): bootstrap inputs, average resulting frontiers
- **Robust optimization**: explicitly model input uncertainty
- **Constraints**: bound weights (min/max), sector limits, turnover limits`,
    mathematicalFormulation: `\\min_w \\frac{1}{2} w^T \\Sigma w - \\lambda w^T \\mu

\\text{s.t.} \\quad w^T \\mathbf{1} = 1, \\quad w \\geq 0

\\text{Lagrangian: } L = w^T \\Sigma w - \\lambda(w^T \\mu - \\mu_p) - \\gamma(w^T \\mathbf{1} - 1)`,
    practicalApplication: `If you use MVO, always apply constraints and shrinkage. A simple approach: use Ledoit-Wolf covariance, set max weight = 1/N + 10%, min weight = 0, and target the minimum variance portfolio (skip return estimation entirely). This "minimum variance" approach has historically matched or beaten optimized portfolios because it avoids the noisiest input (expected returns).`,
    limitations:
      "Garbage in, garbage out — output is dominated by estimation error. Highly sensitive to expected return inputs. Produces corner solutions without constraints. Single-period static framework. Does not account for estimation risk, liquidity, or transaction costs.",
    authors: ["Harry Markowitz"],
    year: 1952,
    tags: [
      "optimization",
      "quadratic-programming",
      "portfolio-weights",
      "shrinkage",
    ],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.85,
  },

  // ============================================================
  // BEHAVIORAL ECONOMICS (6)
  // ============================================================
  {
    title: "Prospect Theory",
    slug: "prospect-theory",
    domain: "behavioral_econ",
    subdomain: "decision_theory",
    summary:
      "Describes how people evaluate gains and losses asymmetrically — losses hurt roughly twice as much as equivalent gains feel good — and systematically distort probabilities, overweighting small probabilities and underweighting moderate ones.",
    explanation: `Daniel Kahneman and Amos Tversky (1979) demonstrated that actual human decision-making systematically violates expected utility theory. Prospect Theory has three pillars:

1. **Reference dependence**: People evaluate outcomes as gains or losses relative to a reference point, not absolute wealth levels
2. **Loss aversion**: The pain of a loss is approximately 2× the pleasure of an equivalent gain (λ ≈ 2.25)
3. **Probability weighting**: Small probabilities are overweighted (why people buy lottery tickets and insurance simultaneously), while moderate-to-high probabilities are underweighted

The **value function** is concave for gains (diminishing sensitivity) and convex for losses (risk-seeking to avoid sure losses). This explains the **disposition effect**: investors hold losers (risk-seeking in losses) and sell winners (risk-averse in gains).

Prospect theory won Kahneman the 2002 Nobel Prize in Economics and fundamentally changed our understanding of financial decision-making.`,
    mathematicalFormulation: `v(x) = \\begin{cases} x^\\alpha & \\text{if } x \\geq 0 \\\\ -\\lambda(-x)^\\beta & \\text{if } x < 0 \\end{cases}

\\alpha \\approx 0.88, \\quad \\beta \\approx 0.88, \\quad \\lambda \\approx 2.25

\\pi(p) = \\frac{p^\\gamma}{(p^\\gamma + (1-p)^\\gamma)^{1/\\gamma}}`,
    practicalApplication: `Recognize loss aversion in your own behavior: do you check your portfolio more when it's up? Are you holding losers hoping to break even? Set predetermined stop-losses and take-profit levels before entering positions to overcome the disposition effect. When evaluating new positions, frame them in terms of total portfolio impact, not individual P&L — this reduces reference point bias.`,
    limitations:
      "Descriptive, not normative (tells what people do, not what they should do). Parameters are context-dependent. Cumulative Prospect Theory (1992) addresses some issues with the original formulation. Hard to apply to portfolio-level decisions.",
    authors: ["Daniel Kahneman", "Amos Tversky"],
    year: 1979,
    sourceUrl: "https://doi.org/10.2307/1914185",
    tags: [
      "loss-aversion",
      "probability-weighting",
      "reference-dependence",
      "behavioral-finance",
    ],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.95,
  },
  {
    title: "Anchoring Bias",
    slug: "anchoring-bias",
    domain: "behavioral_econ",
    subdomain: "cognitive_biases",
    summary:
      "The tendency for initial information (the 'anchor') to disproportionately influence subsequent judgments and estimates, even when the anchor is arbitrary or irrelevant.",
    explanation: `Anchoring, first documented by Tversky and Kahneman (1974), occurs when people insufficiently adjust from an initial value. In finance, common anchors include:

- **Purchase price**: investors anchor to their buy price when deciding to sell
- **52-week high/low**: used as psychological resistance/support
- **Analyst price targets**: anchors investor expectations
- **Round numbers**: stocks cluster around $10, $50, $100

The mechanism is "anchoring and insufficient adjustment" — even when people know the anchor is irrelevant, they adjust insufficiently. In experiments, spinning a random number wheel influenced estimates of African countries in the UN.

In earnings announcements, analysts anchor to consensus estimates. Stocks that beat by a penny are rewarded; those that miss by a penny are punished — regardless of the absolute quality of results.`,
    practicalApplication: `Be aware of your own anchors. When analyzing a stock, don't start from its current price — start from intrinsic value calculations. Write down your valuation before checking the market price. Use "reference class forecasting": compare with similar companies/situations rather than adjusting from the current number. When an analyst publishes a price target, ask what model produced it rather than accepting the number.`,
    limitations:
      "Difficult to fully de-bias, even with awareness. Some anchoring may be rational (Bayesian updating from a prior). The line between anchoring and reasonable use of base rates is blurry.",
    authors: ["Amos Tversky", "Daniel Kahneman"],
    year: 1974,
    tags: ["cognitive-bias", "valuation", "behavioral-finance", "heuristics"],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.85,
  },
  {
    title: "Herding Behavior",
    slug: "herding-behavior",
    domain: "behavioral_econ",
    subdomain: "market_behavior",
    summary:
      "The tendency of investors to follow the actions of a larger group, creating information cascades, momentum effects, and occasionally speculative bubbles, even when individual private information suggests otherwise.",
    explanation: `Herding occurs when investors mimic observed behavior rather than acting on private information. Banerjee (1992) and Bikhchandani, Hirshleifer, and Welch (1992) formalized **information cascades**: rational actors may optimally ignore their private signals and follow the crowd if they believe others have better information.

In markets, herding manifests as:
- **Momentum**: stocks that have risen continue to rise as more investors pile in
- **Bubbles**: positive feedback loops where rising prices attract buyers, driving prices higher
- **Crashes**: sudden reversal when herd turns, creating cascading sell orders
- **Institutional herding**: fund managers cluster around benchmark weights (career risk)

The mechanism is partly rational (information extraction) and partly behavioral (social proof, FOMO, career concerns). Keynes's "beauty contest" analogy captures it: investors try to predict what others will buy, not what has fundamental value.`,
    practicalApplication: `Monitor herding indicators: extreme fund flows, consensus positioning (CFTC data), social media sentiment spikes. When everyone is positioned the same way, the risk of reversal is highest. Contrarian strategies profit from herding reversals, but timing is difficult — "the market can stay irrational longer than you can stay solvent." Use momentum as a signal (not all herding is wrong), but reduce exposure when positioning becomes extremely crowded.`,
    limitations:
      "Hard to distinguish rational information aggregation from irrational herding in real time. Contrarian strategies have poor timing. Not all consensus is wrong — sometimes the crowd is right.",
    authors: [
      "Abhijit Banerjee",
      "Sushil Bikhchandani",
      "David Hirshleifer",
    ],
    year: 1992,
    tags: [
      "information-cascades",
      "momentum",
      "bubbles",
      "crowd-behavior",
    ],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.85,
  },
  {
    title: "Disposition Effect",
    slug: "disposition-effect",
    domain: "behavioral_econ",
    subdomain: "market_behavior",
    summary:
      "The well-documented tendency for investors to sell winning positions too early and hold losing positions too long, driven by loss aversion and the desire to realize gains while avoiding the pain of crystallizing losses.",
    explanation: `Shefrin and Statman (1985) named this phenomenon, and Odean (1998) provided definitive empirical evidence using brokerage data. Individual investors are ~50% more likely to sell a winner than a loser.

The mechanism combines several biases:
- **Loss aversion** (Prospect Theory): realizing a loss is psychologically painful
- **Mental accounting**: each position is evaluated in isolation, not as part of a portfolio
- **Regret avoidance**: selling a loser admits you made a mistake
- **Mean reversion belief**: false expectation that losers will bounce back

The disposition effect is costly: studies show that the winners investors sell subsequently outperform the losers they hold. By selling winners and holding losers, investors systematically do the opposite of momentum investing.

Institutional investors show less disposition effect (accountability, systematic processes), but it's still present even among professionals.`,
    practicalApplication: `Combat the disposition effect with rules: set stop-losses at entry (e.g., -15%), and trailing stops for winners. Tax-loss harvesting turns the disposition effect upside down — deliberately sell losers for tax benefits. Review your portfolio by asking "would I buy this today at this price?" for each holding. If the answer is no, the position is held for emotional reasons, not analytical ones.`,
    limitations:
      "Tax considerations sometimes justify holding losers (tax-loss harvesting timing). Mean reversion is real for some assets. Not all loss-holding is irrational — fundamental conviction may be correct.",
    authors: ["Hersh Shefrin", "Meir Statman", "Terrance Odean"],
    year: 1985,
    tags: [
      "loss-aversion",
      "selling-behavior",
      "behavioral-finance",
      "tax-loss-harvesting",
    ],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.88,
  },
  {
    title: "Overconfidence Bias",
    slug: "overconfidence-bias",
    domain: "behavioral_econ",
    subdomain: "cognitive_biases",
    summary:
      "The systematic tendency to overestimate the accuracy of one's knowledge and predictions, leading to excessive trading, inadequate diversification, and underestimation of risk.",
    explanation: `Overconfidence in finance takes three forms:

1. **Miscalibration**: people's 90% confidence intervals contain the true value only ~50% of the time
2. **Better-than-average effect**: most investors believe they're above-average investors
3. **Illusion of control**: active traders believe they can control outcomes through skill

Barber and Odean (2000) showed that individual investors who trade most actively earn the lowest returns — the top quintile by turnover underperformed by 6.5% annually. Overconfidence drives excessive trading, which generates transaction costs and taxes without compensating alpha.

Gender studies show men trade 45% more than women and earn ~1% less annually as a result — consistent with higher male overconfidence in financial domains.

Professional forecasters also exhibit overconfidence. Analyst earnings estimates and GDP forecasts consistently show over-tight confidence intervals.`,
    practicalApplication: `Track your own prediction accuracy. Write down your thesis and expected return range before investing. Review quarterly — are you calibrated? If your 90% ranges miss >50% of the time, widen them. Reduce trading frequency — implement a "cooling off" period before any trade. Keep a decision journal documenting reasoning. Seek disconfirming evidence actively.`,
    limitations:
      "Some overconfidence may be functional (entrepreneurship requires it). In some domains, experts are well-calibrated (e.g., weather forecasters). The optimal level of confidence is not zero.",
    authors: ["Brad Barber", "Terrance Odean"],
    year: 2000,
    tags: [
      "cognitive-bias",
      "trading-frequency",
      "calibration",
      "decision-making",
    ],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.85,
  },
  {
    title: "Narrative Economics",
    slug: "narrative-economics",
    domain: "behavioral_econ",
    subdomain: "market_behavior",
    summary:
      "Robert Shiller's framework arguing that popular stories and narratives spread virally and drive major economic events, including booms, busts, and policy changes, functioning as economic 'epidemics.'",
    explanation: `Robert Shiller (2017, 2019) proposed that economics needs to take narratives seriously as causal forces. Economic narratives — stories people tell about the economy — spread like viruses, with contagion rates, mutation, recovery, and potential for recurrence.

Examples of powerful economic narratives:
- "Housing prices never fall" (pre-2008)
- "This time is different" (every bubble)
- "AI will replace all jobs" (current)
- "Bitcoin is digital gold" (crypto narrative)
- "The great resignation" (post-COVID labor narrative)

Narratives affect economic outcomes through:
- Changing consumer/investor confidence
- Influencing spending and saving decisions
- Driving asset allocation shifts
- Shaping policy responses

Shiller argues that traditional economics ignores narratives because they're hard to quantify, but they're often more powerful than measurable fundamentals in driving short-to-medium-term market moves.`,
    practicalApplication: `Monitor dominant market narratives (financial media, social platforms, podcast themes). When a narrative becomes consensus ("everyone knows AI will..."), it's likely priced in. The investment opportunity lies in narrative shifts — identifying when a narrative is weakening or when a new counter-narrative is emerging. Use Google Trends and media sentiment analysis as narrative tracking tools. Be especially cautious when a single narrative dominates — it creates crowded positioning vulnerable to reversal.`,
    limitations:
      "Hard to quantify narrative strength rigorously. Narrative identification is subjective. Timing narrative shifts is as difficult as timing markets. Some narratives are correct (narrative doesn't imply false).",
    authors: ["Robert Shiller"],
    year: 2017,
    tags: [
      "narratives",
      "market-sentiment",
      "contagion",
      "behavioral-macro",
    ],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.82,
  },

  // ============================================================
  // MACROECONOMIC MODELS (5)
  // ============================================================
  {
    title: "IS-LM Model",
    slug: "is-lm-model",
    domain: "macro",
    subdomain: "monetary_policy",
    summary:
      "The workhorse macroeconomic model that simultaneously determines equilibrium output and interest rates through the interaction of the goods market (IS curve) and money market (LM curve).",
    explanation: `John Hicks (1937) formalized Keynes's General Theory into the IS-LM framework. It remains the starting point for macroeconomic analysis:

**IS curve** (Investment-Saving): shows combinations of output (Y) and interest rate (r) where the goods market is in equilibrium. Slopes downward because lower interest rates stimulate investment, raising output.

**LM curve** (Liquidity-Money): shows combinations where money market is in equilibrium. Slopes upward because higher output increases money demand, requiring higher interest rates to maintain equilibrium.

The intersection determines equilibrium GDP and interest rate. Policy analysis:
- **Fiscal expansion** (government spending ↑) shifts IS right → higher Y and r
- **Monetary expansion** (money supply ↑) shifts LM right → higher Y and lower r
- **Crowding out**: fiscal expansion raises r, partially offsetting the output increase

At the **zero lower bound** (r ≈ 0), the LM curve is flat (liquidity trap) — monetary policy is ineffective, fiscal policy becomes essential. This describes Japan (1990s-present) and post-2008 Western economies.`,
    mathematicalFormulation: `\\text{IS: } Y = C(Y-T) + I(r) + G

\\text{LM: } \\frac{M}{P} = L(Y, r)

\\text{Equilibrium: IS} \\cap \\text{LM}`,
    practicalApplication: `Use IS-LM to anticipate the direction of interest rates and growth after policy changes. When governments announce fiscal stimulus, expect upward pressure on rates (unless at zero lower bound). When central banks ease, expect lower rates and (eventually) higher output. The framework helps sequence trades around policy announcements: rate-sensitive assets first, growth-sensitive assets second.`,
    limitations:
      "Static (no dynamics), assumes fixed prices (short-run only), closed economy (Mundell-Fleming extends to open). Doesn't model expectations or supply shocks. Outdated as a research tool but remains pedagogically essential.",
    authors: ["John Hicks", "John Maynard Keynes"],
    year: 1937,
    tags: [
      "macroeconomics",
      "monetary-policy",
      "fiscal-policy",
      "interest-rates",
    ],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.85,
  },
  {
    title: "Taylor Rule",
    slug: "taylor-rule",
    domain: "macro",
    subdomain: "monetary_policy",
    summary:
      "A prescriptive formula for central bank interest rate setting based on inflation deviation from target and output gap, serving as both a policy benchmark and a predictor of central bank behavior.",
    explanation: `John Taylor (1993) proposed a simple rule that describes how central banks should set short-term interest rates. The rule suggests rates should respond to two gaps:

1. **Inflation gap**: how far current inflation is from target (typically 2%)
2. **Output gap**: how far actual GDP is from potential GDP

When the Taylor Rule prescribes a rate significantly different from the actual policy rate, it signals either that the central bank sees something the rule doesn't, or that policy is out of alignment. The ECB, Fed, and BoE don't officially follow the rule, but their behavior tracks it reasonably well.

The rule gained predictive fame when it would have prescribed much higher rates during 2003-2005 (the "Taylor Rule gap"), potentially preventing the housing bubble that led to the 2008 crisis.

Modern variants include:
- **Inertia/smoothing**: central banks adjust gradually toward the Taylor rate
- **Forward-looking**: use expected inflation instead of current
- **Financial stability**: add credit growth or asset price terms`,
    mathematicalFormulation: `r = r^* + \\pi + 0.5(\\pi - \\pi^*) + 0.5(y - y^*)

r^* \\approx 2\\%, \\quad \\pi^* \\approx 2\\%`,
    practicalApplication: `Calculate the Taylor Rule rate for EUR (using ECB inflation target of 2% and Eurostat output gap estimates). Compare with the actual ECB deposit rate. A large gap suggests the ECB is either behind the curve (rate too low) or deliberately accommodative/restrictive. Trade the convergence: if Taylor prescribes higher rates, position for rate hikes (short duration, bank stocks, avoid rate-sensitive growth stocks).`,
    limitations:
      "Requires estimating unobservable variables (potential output, natural rate). Simple linear rule may be inappropriate in complex environments. Doesn't account for financial stability concerns, exchange rates, or global spillovers.",
    authors: ["John B. Taylor"],
    year: 1993,
    tags: [
      "central-bank",
      "interest-rate-rule",
      "inflation-targeting",
      "monetary-policy",
    ],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.88,
  },
  {
    title: "Yield Curve Analysis",
    slug: "yield-curve-analysis",
    domain: "macro",
    subdomain: "yield_curve",
    summary:
      "The study of the relationship between bond yields and maturities, where the shape of the yield curve — normal, flat, or inverted — serves as one of the most reliable leading indicators of economic conditions.",
    explanation: `The yield curve plots interest rates of bonds with different maturities (typically government bonds). Three theories explain its shape:

1. **Expectations hypothesis**: long rates reflect expected future short rates
2. **Liquidity premium**: investors demand extra yield for locking up money longer
3. **Market segmentation**: different investors dominate different maturities

**Shapes and signals**:
- **Normal (upward sloping)**: healthy economy, positive term premium
- **Flat**: uncertainty, transition period
- **Inverted (downward sloping)**: recession predictor — short rates above long rates signals market expects rate cuts (i.e., economic weakness ahead)

The **10Y-2Y spread** has inverted before every US recession since 1960, with only one false signal. The lead time varies (6-24 months), making it an imprecise timing tool but a reliable directional signal.

**Steepening/flattening dynamics**:
- Bear steepener (long rates rise faster): inflation expectations increasing
- Bull flattener (short rates fall slower): growth slowing, rate cuts expected
- Bear flattener: tightening cycle
- Bull steepener: early recovery, central bank cutting rates`,
    mathematicalFormulation: `\\text{Term spread} = r_{10Y} - r_{2Y}

\\text{Expectations: } (1+r_{nY})^n = (1+r_{1Y}) \\prod_{i=1}^{n-1} (1 + E[r_{1Y,i}])`,
    practicalApplication: `Monitor the EUR yield curve (German Bunds) daily. When the 10Y-2Y spread inverts, begin shifting portfolio toward defensive positioning over 6-12 months (increase cash, reduce cyclical exposure, add quality bonds). The curve's slope is also useful for bank stock analysis — banks profit from the spread between borrowing short and lending long. A flat/inverted curve compresses bank margins.`,
    limitations:
      "Lead time is highly variable (6-24 months before recession). Quantitative easing distorts term premia, potentially reducing predictive power. Works best in the US; less tested for EUR/other curves.",
    authors: ["Various — institutionalized market knowledge"],
    year: 1960,
    tags: [
      "bonds",
      "recession-indicator",
      "term-structure",
      "interest-rates",
    ],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.9,
  },
  {
    title: "Mundell-Fleming Model",
    slug: "mundell-fleming-model",
    domain: "macro",
    subdomain: "international",
    summary:
      "Extends IS-LM to an open economy with capital flows and exchange rates, demonstrating the 'impossible trinity': a country cannot simultaneously have free capital flows, a fixed exchange rate, and independent monetary policy.",
    explanation: `Robert Mundell and Marcus Fleming (1960s) extended IS-LM to analyze monetary and fiscal policy in open economies. The key addition is the **BP curve** (Balance of Payments) representing external equilibrium.

The **Impossible Trinity (Trilemma)**: any country can choose at most two of:
1. Free capital mobility
2. Fixed exchange rate
3. Independent monetary policy

Examples:
- **US/Eurozone**: free capital + independent monetary → floating exchange rate
- **Hong Kong**: free capital + fixed rate → no independent monetary policy (currency board)
- **China (historically)**: fixed rate + monetary independence → capital controls

Policy effectiveness depends on the exchange rate regime:
- **Flexible rates**: monetary policy is effective (exchange rate adjusts), fiscal policy is less effective (crowding out via appreciation)
- **Fixed rates**: fiscal policy is effective, monetary policy is ineffective (must maintain peg)

This framework is essential for understanding emerging market crises (Asian 1997, Argentina 2001) — trying to maintain all three is unsustainable.`,
    mathematicalFormulation: `\\text{IS: } Y = C(Y-T) + I(r) + G + NX(Y, Y^*, e)

\\text{LM: } \\frac{M}{P} = L(Y, r)

\\text{BP: } CA(Y, Y^*, e) + KA(r - r^*) = 0`,
    practicalApplication: `Use Mundell-Fleming to anticipate currency movements after policy changes. For EUR: ECB rate cuts → capital outflows → EUR depreciation → benefits exporters. For emerging market investments, assess whether the country is trying to maintain an impossible trinity — if so, a crisis is eventually likely. The framework also helps analyze carry trades: borrow in low-rate currencies, invest in high-rate currencies, but understand the trilemma risks.`,
    limitations:
      "Static model, no expectations or dynamics. Assumes perfect capital mobility or immobility (reality is partial). Price rigidity assumption limits long-run applicability. Doesn't handle currency crises well (non-linear events).",
    authors: ["Robert Mundell", "Marcus Fleming"],
    year: 1963,
    tags: [
      "open-economy",
      "exchange-rates",
      "impossible-trinity",
      "capital-flows",
    ],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.85,
  },
  {
    title: "Minsky's Financial Instability Hypothesis",
    slug: "minsky-financial-instability",
    domain: "macro",
    subdomain: "business_cycle",
    summary:
      "The theory that stability itself breeds instability in financial systems, as prolonged periods of calm encourage increasingly risky lending and borrowing, leading to inevitable crises — the 'Minsky moment.'",
    explanation: `Hyman Minsky (1986, 1992) argued that capitalist economies are inherently unstable because financial structures evolve from robust to fragile during periods of prosperity. The mechanism:

1. **Hedge finance**: borrowers can service both interest and principal from income
2. **Speculative finance**: borrowers can service interest but must roll over principal
3. **Ponzi finance**: borrowers can't cover interest — they depend on asset appreciation

During extended calm, lenders relax standards, borrowers take more risk, and the system migrates from hedge → speculative → Ponzi finance. The **Minsky moment** arrives when assets stop appreciating and Ponzi borrowers can't refinance.

The 2008 financial crisis was a textbook Minsky moment:
- Years of stability → relaxed lending standards → subprime mortgages (Ponzi finance)
- Housing prices stopped rising → defaults → bank losses → credit contraction → recession

Minsky was largely ignored during his lifetime but became the most-cited economist during the 2008 crisis. His work challenges efficient market theory: markets are not self-stabilizing — they self-destabilize.`,
    practicalApplication: `Track credit cycle indicators: credit-to-GDP gap (BIS data), lending standards surveys, corporate leverage ratios, housing price-to-income ratios. When all indicators signal euphoria (low spreads, easy credit, rising leverage), begin de-risking. Minsky's framework is particularly useful for timing macro allocation — reduce equity/credit exposure as the system moves toward speculative/Ponzi finance. The BIS credit gap has historically signaled crises 2-3 years in advance.`,
    limitations:
      "Qualitative framework — hard to precisely measure where in the Minsky cycle we are. Timing is notoriously difficult (can take years for the Minsky moment to arrive). Government intervention can extend cycles indefinitely. Some argue Minsky underestimates the stabilizing role of institutions.",
    authors: ["Hyman Minsky"],
    year: 1986,
    tags: [
      "financial-crises",
      "credit-cycle",
      "leverage",
      "systemic-risk",
    ],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.9,
  },

  // ============================================================
  // FUTURES STUDIES (5)
  // ============================================================
  {
    title: "Scenario Planning",
    slug: "scenario-planning",
    domain: "futures_studies",
    subdomain: "methods",
    summary:
      "A structured method for exploring multiple plausible futures by identifying critical uncertainties and developing coherent narratives, used by Shell Oil since the 1970s and increasingly applied to investment strategy.",
    explanation: `Scenario planning, pioneered by Pierre Wack and Peter Schwartz at Royal Dutch Shell in the 1970s, is not about predicting the future but about preparing for multiple futures. The method:

1. **Identify focal question**: "What will the energy transition look like by 2035?"
2. **Identify driving forces**: technology, regulation, demographics, geopolitics, social values
3. **Rank by impact and uncertainty**: high-impact, high-uncertainty forces define scenario axes
4. **Build 3-4 coherent scenarios**: each scenario is an internally consistent narrative
5. **Develop indicators**: early signals that one scenario is materializing
6. **Test strategies**: evaluate your portfolio/strategy against all scenarios

Shell famously prepared for the 1973 oil crisis using scenarios, enabling faster adaptation than competitors. The method is now used by the IPCC, World Economic Forum, and major institutional investors.

Unlike forecasting (one number), scenario planning expands thinking to explore "what if?" questions that linear models can't capture.`,
    practicalApplication: `Build 3-4 macro scenarios for the next 5 years (e.g., "soft landing," "secular stagnation," "inflation resurgence," "deglobalization shock"). For each, determine which assets outperform and underperform. Construct a portfolio that is robust across all scenarios rather than optimized for one. Review monthly: which early indicators are firing? Gradually tilt toward the scenario gaining evidence while maintaining optionality for others.`,
    limitations:
      "Time-intensive to do properly. Can generate too many scenarios if not disciplined. Groupthink in scenario workshops. People anchor on the 'most likely' scenario despite the method's intent. Doesn't assign probabilities (can be a feature or bug).",
    authors: ["Pierre Wack", "Peter Schwartz"],
    year: 1971,
    tags: [
      "strategic-planning",
      "uncertainty",
      "multiple-futures",
      "shell-method",
    ],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.88,
  },
  {
    title: "Delphi Method",
    slug: "delphi-method",
    domain: "futures_studies",
    subdomain: "methods",
    summary:
      "A structured technique for eliciting expert consensus through multiple rounds of anonymous surveying, where participants receive aggregated feedback between rounds, converging on more calibrated estimates.",
    explanation: `Developed at RAND Corporation in the 1950s by Olaf Helmer and Norman Dalkey, the Delphi method harnesses collective expert judgment while mitigating groupthink, anchoring to authority, and social pressure.

The process:
1. **Round 1**: experts independently answer questions (quantitative estimates or qualitative judgments)
2. **Aggregation**: collect and summarize responses (median, interquartile range, reasoning)
3. **Round 2**: share aggregated results; experts can revise their estimates
4. **Repeat**: typically 3-4 rounds until convergence (or agreement to disagree)

Key design principles:
- **Anonymity**: prevents dominant personalities from biasing results
- **Iteration with feedback**: allows experts to update based on peers' reasoning
- **Statistical aggregation**: median of expert estimates is more accurate than any individual

Research shows Delphi produces better-calibrated estimates than unstructured expert discussion, though it can suffer from false consensus and anchoring to the initial distribution.`,
    practicalApplication: `For major allocation decisions, conduct a personal "mini-Delphi": gather 5-10 expert forecasts from different sources (sell-side, buy-side, academic, independent). Note the median and range. Give extra weight to forecasters who provide reasoning (not just numbers) and who have track records. This structured aggregation consistently outperforms relying on a single "star" forecaster.`,
    limitations:
      "Time-consuming. Expert selection biases results. Can converge on a wrong answer (false consensus). Anonymity prevents productive debate. Works best for estimable quantities, less for qualitative scenarios.",
    authors: ["Olaf Helmer", "Norman Dalkey"],
    year: 1953,
    tags: [
      "expert-judgment",
      "consensus-building",
      "forecasting",
      "RAND-corporation",
    ],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.82,
  },
  {
    title: "Causal Layered Analysis (CLA)",
    slug: "causal-layered-analysis",
    domain: "futures_studies",
    subdomain: "methods",
    summary:
      "A four-level analytical framework that examines issues from surface-level data down through systemic causes, worldviews, and deep myths/metaphors, enabling transformative (not just incremental) futures thinking.",
    explanation: `Sohail Inayatullah (1998) developed CLA as a method to move beyond shallow trend analysis to understand the deep structures that shape the future. The four layers:

1. **Litany**: the surface level — newspaper headlines, data points, official positions. "Stock markets hit all-time highs." Easiest to observe, shallowest understanding.

2. **Systemic causes**: social, economic, political, technological factors that produce the litany. "Low interest rates, quantitative easing, and TINA (There Is No Alternative) drive equity allocation."

3. **Worldview/discourse**: the deeper assumptions, values, and frameworks that legitimize the systemic structure. "Growth-oriented capitalism, GDP as progress metric, shareholder primacy, faith in central bank omnipotence."

4. **Myth/metaphor**: the deepest layer — the unconscious stories and archetypes that shape entire civilizations. "The invisible hand, progress as linear, technology as salvation, markets as natural phenomena."

CLA is transformative because changing the myth layer changes everything above it. Most analysis stays at levels 1-2; CLA forces engagement with the structural assumptions underlying financial markets.`,
    practicalApplication: `When analyzing any major market theme, push through all four layers. Example for "AI investment boom": Litany (NVIDIA earnings triple), Systemic (compute demand exceeds supply, venture funding concentrated), Worldview (technology determinism, winner-take-all economics), Myth (human progress through machines, deus ex machina). At each layer, ask: what would it take for this to change? The deeper the level at which change occurs, the more disruptive and less forecastable it is. This helps identify tail risks invisible to conventional analysis.`,
    limitations:
      "Subjective — different analysts may categorize layers differently. Not quantitative. Can become pseudo-philosophical without rigorous application. The deepest layers are hardest to act on in portfolio management.",
    authors: ["Sohail Inayatullah"],
    year: 1998,
    tags: [
      "deep-analysis",
      "critical-futures",
      "worldview-analysis",
      "transformative",
    ],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.82,
  },
  {
    title: "Cross-Impact Analysis",
    slug: "cross-impact-analysis",
    domain: "futures_studies",
    subdomain: "methods",
    summary:
      "A systematic method for mapping how the occurrence of one event changes the probability of other events, revealing hidden interdependencies and cascade effects in complex systems.",
    explanation: `Cross-Impact Analysis (CIA), developed by Theodore Gordon and Olaf Helmer (1966), creates a matrix of events and their conditional probabilities. For each pair of events, the analyst estimates: "If event A occurs, how does the probability of event B change?"

The resulting matrix reveals:
- **Reinforcing loops**: events that increase each other's probability (positive feedback)
- **Inhibiting relationships**: events that decrease each other's probability
- **Key drivers**: events that influence many others (high outgoing impact)
- **Dependent events**: events influenced by many others (high incoming impact)
- **Cascade chains**: sequences of events that trigger each other

The method quantifies something humans do intuitively but poorly: assess conditional probabilities. By forcing explicit estimation of each cross-impact, the method surfaces hidden assumptions and reveals non-obvious connections.

Modern extensions include MICMAC (cross-impact matrix multiplication) and Bayesian network approaches.`,
    practicalApplication: `Build a cross-impact matrix for key risks in your portfolio. Events: "ECB raises rates 50bp", "EUR/USD hits parity", "China stimulus", "Oil above $120", "US recession". Estimate: if each event occurs, how does it change the probability of the others? This reveals concentrated risk — if most of your portfolio benefits from the same cluster of events, you're less diversified than you think. Use the matrix to identify natural hedges.`,
    limitations:
      "Requires many conditional probability estimates (n² for n events). Subject to expert judgment errors. Assumes pairwise interactions only (misses higher-order effects). Computationally simple but intellectually demanding.",
    authors: ["Theodore Gordon", "Olaf Helmer"],
    year: 1966,
    tags: [
      "conditional-probability",
      "interdependency",
      "cascade-effects",
      "systems-analysis",
    ],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.8,
  },
  {
    title: "Three Horizons Framework",
    slug: "three-horizons-framework",
    domain: "futures_studies",
    subdomain: "frameworks",
    summary:
      "A visual and conceptual framework for understanding how dominant systems (H1) decline, transitional innovations (H2) emerge, and transformative seeds (H3) eventually become the new dominant pattern.",
    explanation: `Bill Sharpe (International Futures Forum) and Andrew Curry popularized the Three Horizons framework for strategic foresight:

**Horizon 1 (H1)**: The current dominant system — "business as usual." Effective today but gradually losing fit with changing conditions. In investing: current market structure, existing asset classes, traditional financial intermediation.

**Horizon 2 (H2)**: Transitional innovations — entrepreneurs and innovators trying to bridge from H1 to H3. Some succeed, most fail. Some extend H1 rather than transforming it ("H2- captures" vs "H2+ pioneers"). In investing: fintech, DeFi, ESG integration, alternative data.

**Horizon 3 (H3)**: Seeds of the future — nascent, often marginalized ideas that could become the next dominant system. Weak signals today, transformative tomorrow. In investing: programmable money, autonomous economic agents, post-growth economics, regenerative business models.

The value is in **seeing all three horizons simultaneously**. H1 thinkers dismiss H3 as fantasy; H3 visionaries dismiss H1 as obsolete. H2 is where the action (and the investment opportunity) lives — but only H2+ innovations that genuinely connect to H3 visions will create lasting value.`,
    practicalApplication: `Map your portfolio across horizons. H1 assets (banks, traditional energy, legacy tech) provide income but face structural headwinds. H3 assets (moonshots, deep tech, paradigm-shifting companies) are high-risk, high-reward. The sweet spot for investment is H2 — companies actively transitioning from old to new paradigms with viable business models today and alignment with H3 trends. Allocate accordingly: H1 for stability, H2 for growth, H3 for optionality.`,
    limitations:
      "Highly interpretive — different analysts map the same innovations to different horizons. No quantitative framework. Can oversimplify complex transitions. The timing of H1→H3 transitions is unpredictable.",
    authors: ["Bill Sharpe", "Andrew Curry"],
    year: 2013,
    tags: [
      "strategic-foresight",
      "transitions",
      "innovation",
      "systems-change",
    ],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.82,
  },

  // ============================================================
  // GAME THEORY (3)
  // ============================================================
  {
    title: "Nash Equilibrium",
    slug: "nash-equilibrium",
    domain: "game_theory",
    subdomain: "equilibria",
    summary:
      "A state in a strategic game where no player can improve their payoff by unilaterally changing their strategy, given that all other players' strategies remain unchanged — the foundational solution concept in non-cooperative game theory.",
    explanation: `John Nash (1950) proved that every finite game has at least one equilibrium (possibly in mixed strategies). At a Nash Equilibrium (NE), each player's strategy is a best response to the strategies of all other players.

Applications in finance:
- **Market microstructure**: bid-ask spreads as equilibrium between market makers
- **Corporate strategy**: pricing games between competitors
- **Auction markets**: bidding strategies in IPOs and bond auctions
- **Central bank games**: monetary policy as a game between central banks
- **Prisoner's dilemma in trading**: why insider trading persists despite penalties

Multiple equilibria are common — the theory predicts *which outcomes are stable*, not which one will occur. Coordination games (e.g., which standard will the market adopt?) can have multiple NE, requiring additional refinements (focal points, subgame perfection) to predict behavior.

The Nash equilibrium concept won John Nash the 1994 Nobel Prize.`,
    mathematicalFormulation: `\\text{A strategy profile } s^* = (s_1^*, s_2^*, \\ldots, s_n^*) \\text{ is a Nash Equilibrium if:}

u_i(s_i^*, s_{-i}^*) \\geq u_i(s_i, s_{-i}^*) \\quad \\forall s_i \\in S_i, \\forall i`,
    practicalApplication: `Think about your investment decisions as games against other market participants. When you buy, someone is selling — what do they know that you don't? In competitive markets, the Nash equilibrium often implies zero excess returns for informed traders (efficient market hypothesis as NE). Use game-theoretic reasoning to identify situations where equilibria are shifting: regulatory changes that alter payoffs, new entrants that disrupt established strategies, or information asymmetries that create temporary disequilibria.`,
    limitations:
      "Multiple equilibria problem — can't always predict which one obtains. Assumes rational players (bounded rationality in practice). Computationally hard for complex games. Static concept — doesn't capture learning/adaptation.",
    authors: ["John Nash"],
    year: 1950,
    sourceUrl: "https://doi.org/10.1073/pnas.36.1.48",
    tags: ["strategic-interaction", "equilibrium", "non-cooperative", "rationality"],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.9,
  },
  {
    title: "Mechanism Design",
    slug: "mechanism-design",
    domain: "game_theory",
    subdomain: "mechanism_design",
    summary:
      "The 'reverse game theory' that designs rules and institutions to achieve desired outcomes when participants have private information and strategic incentives — foundational to auction design, market structure, and regulation.",
    explanation: `Mechanism design, developed by Leonid Hurwicz, Roger Myerson, and Eric Maskin (Nobel 2007), asks: given that participants are strategic and have private information, what rules produce the best outcomes?

Key concepts:
- **Incentive compatibility**: truth-telling must be a best response (no gain from lying)
- **Individual rationality**: participation must be voluntary (no one is worse off participating)
- **Revelation principle**: any mechanism's outcome can be replicated by a direct mechanism where truth-telling is optimal

Applications in finance:
- **Auction design**: Vickrey (second-price) auctions incentivize truthful bidding
- **IPO mechanisms**: book-building vs. Dutch auction design
- **Market microstructure**: exchange rules that minimize adverse selection
- **Regulation**: designing incentive-compatible regulatory frameworks
- **DeFi**: automated market maker design as mechanism design

The key insight: good institutions don't require altruism — they align private incentives with social objectives.`,
    mathematicalFormulation: `\\text{Incentive compatible: } u_i(f(\\theta_i, \\theta_{-i}), \\theta_i) \\geq u_i(f(\\theta_i', \\theta_{-i}), \\theta_i) \\quad \\forall \\theta_i, \\theta_i'

\\text{Individual rationality: } u_i(f(\\theta), \\theta_i) \\geq u_i^0 \\quad \\forall \\theta_i`,
    practicalApplication: `When evaluating a market or institution, ask: are the incentives aligned? If a broker earns commission regardless of your outcome, the mechanism is misaligned. If a fund manager has no skin in the game (no personal investment), the mechanism is misaligned. Prefer markets and intermediaries where the mechanism design aligns provider and user incentives. In DeFi, evaluate protocol design through the mechanism design lens: does the tokenomics create perverse incentives?`,
    limitations:
      "Assumes agents are fully rational and strategic. In practice, behavioral factors may dominate mechanism effects. Information requirements for optimal mechanism design are extreme. Many real-world mechanisms evolved rather than being designed.",
    authors: ["Leonid Hurwicz", "Roger Myerson", "Eric Maskin"],
    year: 1972,
    tags: [
      "incentive-design",
      "auctions",
      "market-design",
      "information-economics",
    ],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.85,
  },
  {
    title: "Auction Theory",
    slug: "auction-theory",
    domain: "game_theory",
    subdomain: "mechanism_design",
    summary:
      "The mathematical analysis of bidding strategies and revenue outcomes in different auction formats, with direct applications to IPOs, bond markets, spectrum allocation, and any setting where assets are sold through competitive bidding.",
    explanation: `William Vickrey (1961) and later Paul Milgrom and Robert Wilson (Nobel 2020) developed the theory of auctions, one of game theory's most practical branches.

**Four standard auction types**:
1. **English (ascending)**: open bidding, highest bidder wins. Dominant strategy: bid up to your valuation.
2. **Dutch (descending)**: price drops until someone accepts. Strategically equivalent to sealed first-price.
3. **First-price sealed bid**: highest bid wins, pays their bid. Optimal: shade below true value.
4. **Vickrey (second-price sealed)**: highest bid wins, pays second-highest bid. Dominant strategy: bid true value.

**Revenue Equivalence Theorem**: under standard assumptions (private values, risk-neutral bidders, symmetric), all four formats generate the same expected revenue.

**Common value auctions** (where the item has the same unknown value to all bidders) create the **winner's curse**: the winning bidder likely overestimated the value. This directly applies to:
- IPO bidding (shared value of new stock)
- Oil lease auctions
- M&A bidding wars
- Any competitive investment process`,
    mathematicalFormulation: `\\text{Vickrey: } b_i^* = v_i \\quad \\text{(bid true value)}

\\text{First-price: } b_i^* = v_i - \\frac{1}{n-1}v_i = \\frac{n-2}{n-1}v_i

\\text{Revenue equivalence: } E[R_{\\text{English}}] = E[R_{\\text{Dutch}}] = E[R_{\\text{1st}}] = E[R_{\\text{2nd}}]`,
    practicalApplication: `Beware the winner's curse in competitive investment situations. In hot IPOs, the fact that you received an allocation may be bad news — you "won" because informed investors didn't bid as aggressively. In M&A analysis, acquiring companies consistently overpay (empirically: acquirer stock drops on announcement ~60% of the time). When competing for any asset against informed counterparties, systematically adjust your valuation downward to account for the winner's curse.`,
    limitations:
      "Standard theory assumes rational, risk-neutral bidders (often violated). Revenue equivalence breaks with risk aversion, asymmetric bidders, or collusion. Real auctions have complex rules that don't fit standard models.",
    authors: ["William Vickrey", "Paul Milgrom", "Robert Wilson"],
    year: 1961,
    tags: [
      "auctions",
      "bidding-strategy",
      "winners-curse",
      "market-microstructure",
    ],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.85,
  },

  // ============================================================
  // COMPLEXITY SCIENCE (1)
  // ============================================================
  {
    title: "Fat Tails & Power Laws",
    slug: "fat-tails-power-laws",
    domain: "complexity",
    subdomain: "power_laws",
    summary:
      "The observation that financial returns follow fat-tailed distributions (not Gaussian), meaning extreme events are far more frequent than standard models predict — rendering most risk models dangerously overconfident.",
    explanation: `Benoit Mandelbrot (1963) first demonstrated that cotton prices follow a Lévy stable distribution with fat tails, not the Gaussian distribution assumed by modern finance. Nassim Taleb later popularized these ideas through the concept of "Black Swans."

**Key facts**:
- A Gaussian model predicts the 2008 crash as a 25-sigma event (probability: effectively zero). It happened.
- Daily S&P 500 moves >4σ occur ~10× more often than Gaussian predicts
- The 10 worst days in S&P 500 history account for ~60% of total returns if missed
- Power laws: P(X > x) ∝ x^(-α), where α ≈ 3 for financial returns (finite variance but infinite kurtosis)

**Implications for portfolio management**:
1. VaR models systematically underestimate tail risk
2. Correlations increase in crises (diversification fails when most needed)
3. Option pricing models misprice out-of-the-money puts (they're too cheap under Gaussian assumptions)
4. The "volatility smile" in options markets reflects the market's implicit recognition of fat tails

**Practical distributions**: Student's t-distribution (heavier tails, controlled by degrees of freedom), stable distributions, or empirical distributions capture reality better than Gaussian.`,
    mathematicalFormulation: `\\text{Power law tail: } P(X > x) \\sim x^{-\\alpha}, \\quad \\alpha \\approx 3

\\text{Kurtosis: } \\kappa = \\frac{E[(X-\\mu)^4]}{\\sigma^4} \\gg 3

\\text{Gaussian: } P(|X| > n\\sigma) = \\text{erfc}(n/\\sqrt{2})

\\text{Observed: } P(|X| > 4\\sigma) \\approx 10 \\times P_{\\text{Gaussian}}(|X| > 4\\sigma)`,
    practicalApplication: `Never trust risk models that assume normal distributions. Use historical simulation or t-distributions instead of Gaussian for VaR/CVaR. Over-allocate to tail hedges (out-of-the-money puts are cheap relative to true tail probabilities). Build portfolios that survive extreme moves: no single position should threaten portfolio survival. Follow Taleb's barbell strategy: ~85% in ultra-safe assets, ~15% in high-convexity bets that profit from extreme events.`,
    limitations:
      "Power law exponents are hard to estimate precisely. Not all tails are power-law distributed. Anti-fragility (profiting from disorder) is easier said than done. Tail hedging is chronically expensive in calm markets. Some fat tails may be artifacts of regime changes rather than single distributions.",
    authors: ["Benoit Mandelbrot", "Nassim Nicholas Taleb"],
    year: 1963,
    tags: [
      "tail-risk",
      "non-gaussian",
      "black-swan",
      "power-law",
      "risk-management",
    ],
    relatedEntries: [],
    addedBy: "system",
    isVerified: true,
    qualityScore: 0.92,
  },
];
